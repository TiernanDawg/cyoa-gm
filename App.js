import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  View,
  StyleSheet,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createInitialState, getCurrentNode, applyChoice, resolveCustomAction } from './src/game/engine';
import { narrate, narrateFreeform, generateOpening, testConnection } from './src/llm/narrator';

const GOOGLE_MODELS = [
  { label: 'Gemini 3.8 Flash · Recommended', value: 'gemini-3.8-flash' },
  { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
  { label: 'Gemini 3.5 Flash-Lite', value: 'gemini-3.5-flash-lite' },
  { label: 'Gemini 2.5 Flash · Legacy', value: 'gemini-2.5-flash' }
];
const OPENROUTER_MODELS = [
  { label: 'OpenRouter Free · Auto', value: 'openrouter/free' },
  { label: 'Gemini 3.8 Flash', value: 'google/gemini-3.8-flash' },
  { label: 'Llama 3.3 70B Instruct', value: 'meta-llama/llama-3.3-70b-instruct' },
  { label: 'Qwen3 30B A3B', value: 'qwen/qwen3-30b-a3b' },
  { label: 'Custom model ID…', value: '__custom__' }
];
const COMPATIBLE_MODELS = [
  { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
  { label: 'GPT-4.1 mini', value: 'gpt-4.1-mini' },
];
const STORY_STYLES = [
  { label: 'Randomize on every new story', value: 'random' },
  { label: 'Dark Folktale', value: 'Dark Folktale' },
  { label: 'Psychological Dread', value: 'Psychological Dread' },
  { label: 'Cosmic Horror', value: 'Cosmic Horror' },
  { label: 'Gothic Mystery', value: 'Gothic Mystery' }
];
const RANDOM_STYLES = STORY_STYLES.filter(item => item.value !== 'random').map(item => item.value);
const OPENING_VARIANTS = {
  'Dark Folktale': 'The air tastes of wet stone and old candle smoke. A narrow passage divides ahead: a warped wooden door stands ajar to your left, while steps descend into a dark that seems to absorb the weak light behind you. Someone has scratched rows of tally marks into the walls. There are too many to count, and several look freshly cut. Behind you, your footprints are already fading from the dust.',
  'Psychological Dread': 'Cold air crawls over your skin. The corridor splits at a door hanging open on the left and a flight of steps that disappears below. You are certain you have walked this exact passage before, though you cannot remember arriving. A damp footprint appears in front of you, then another, each one facing toward you. The space behind your back feels occupied. When you turn, the corridor is empty—and somehow longer.',
  'Cosmic Horror': 'The stone passage forks beneath a ceiling too high to see. A door hangs open to the left; a stairway angles down to the right. The air presses against your eardrums as if the room were far below the sea. Hair-thin marks cover the wall in spirals that make your eyes water when you try to follow them. From somewhere below comes a slow, measured knock. A second knock answers it from inside the stone.',
  'Gothic Mystery': 'A thin draft moves through the subterranean corridor, carrying the scent of rain and extinguished lamps. To the left, a carved wooden door rests on a single hinge. To the right, a worn stairway drops into darkness. A brass number plate has been torn from the wall, leaving four pale screw holes and a rectangle of clean stone. Your name is written there in a hand you do not recognize. The ink is still wet.'
};
const DEFAULT_CONFIG = {
  aiEnabled: false,
  apiKey: '',
  provider: 'google',
  model: 'gemini-3.8-flash',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  storyStyle: 'random',
  customPremise: ''
};

function chooseRandomStyle() {
  return RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];
}
function modelsFor(provider) {
  if (provider === 'google') return GOOGLE_MODELS;
  if (provider === 'openrouter') return OPENROUTER_MODELS;
  return COMPATIBLE_MODELS;
}
function defaultModelFor(provider) {
  return provider === 'google' ? 'gemini-3.8-flash' : provider === 'openrouter' ? 'openrouter/free' : 'gpt-4o-mini';
}
function openingFor(style) {
  return OPENING_VARIANTS[style] || OPENING_VARIANTS['Dark Folktale'];
}
function readableError(error, apiKey) {
  let message = String(error && error.message ? error.message : 'Unknown error');
  if (apiKey) message = message.split(apiKey).join('[API key hidden]');
  return message.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 260);
}

export default function App() {
  const [initialPlaythrough] = useState(() => {
    const style = chooseRandomStyle();
    return { style, opening: openingFor(style) };
  });
  const [state, setState] = useState(() => createInitialState());
  const [activeStoryStyle, setActiveStoryStyle] = useState(initialPlaythrough.style);
  const [sceneText, setSceneText] = useState(initialPlaythrough.opening);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [lastRoll, setLastRoll] = useState(null);
  const [aiStatus, setAiStatus] = useState('');
  const operationId = useRef(0);
  const node = getCurrentNode(state);

  function openSettings() {
    const options = modelsFor(config.provider);
    const isCustom = !options.some(item => item.value === config.model);
    setDraftConfig({ ...config });
    setCustomModelMode(config.provider !== 'google' && (isCustom || !config.model));
    setCustomModelText(isCustom ? config.model : '');
    setModelDropdownOpen(false);
    setStyleDropdownOpen(false);
    setAiStatus('');
    setShowSettings(true);
  }

  function chooseProvider(provider) {
    setDraftConfig(previous => ({
      ...previous,
      provider,
      model: defaultModelFor(provider)
    }));
    setCustomModelMode(false);
    setCustomModelText('');
    setModelDropdownOpen(false);
  }

  function chooseModel(value) {
    if (value === '__custom__') {
      setCustomModelMode(true);
      setCustomModelText('');
      setDraftConfig(previous => ({ ...previous, model: '' }));
    } else {
      setCustomModelMode(false);
      setCustomModelText('');
      setDraftConfig(previous => ({ ...previous, model: value }));
    }
    setModelDropdownOpen(false);
  }

  function saveSettings() {
    const modelValue = customModelMode ? customModelText.trim() : draftConfig.model.trim();
    if (draftConfig.aiEnabled && !draftConfig.apiKey.trim()) {
      setAiStatus('Enter an API key for the selected provider before saving live AI settings.');
      return;
    } else if (draftConfig.aiEnabled && !modelValue) {
      setAiStatus('Choose a model ID before enabling AI.');
      return;
    } else {
      setAiStatus('');
    }
    const saved = { ...draftConfig, model: modelValue || defaultModelFor(draftConfig.provider) };
    setConfig(saved);
    setDraftConfig(saved);
    setShowSettings(false);
    setModelDropdownOpen(false);
    setStyleDropdownOpen(false);
  }

  async function showScene(nextState, nextNodeId, action, outcome = '', runId) {
    const updated = { ...nextState, nodeId: nextNodeId };
    setState(updated);
    const base = getCurrentNode(updated)?.scene || 'The path ends here.';
    const savedConfig = config;
    try {
      if (savedConfig.aiEnabled && savedConfig.apiKey.trim()) {
        setSceneText(base);
        const narrated = await narrate(base, action, outcome, savedConfig.apiKey, savedConfig.model, savedConfig.provider, savedConfig.endpoint, {
          ...updated,
          storyStyle: activeStoryStyle,
          customPremise: savedConfig.customPremise
        });
        if (runId !== operationId.current) return;
        setSceneText(outcome ? narrated + '\n\n' + outcome : narrated);
      } else {
        const offlineResult = outcome ? base + '\n\n' + outcome : base;
        if (runId === operationId.current) setSceneText(offlineResult);
      }
    } catch (error) {
      if (runId === operationId.current) setSceneText(base + '\n\n[The written story continues. ' + readableError(error, savedConfig.apiKey) + ']');
    } finally {
      if (runId === operationId.current) setBusy(false);
    }
  }

  async function onChoice(choice) {
    if (busy) return;
    Keyboard.dismiss();
    const runId = ++operationId.current;
    setBusy(true);
    const result = applyChoice(state, choice);
    setLastRoll(result.roll ? { ...result.roll, dc: choice.dc, stat: choice.stat } : null);
    const outcome = result.roll
      ? 'D20 ' + result.roll.raw + ' + ' + result.roll.modifier + ' = ' + result.roll.total +
        ' against DC ' + result.roll.dc + ': ' + result.roll.outcome.replace(/_/g, ' ') + '.'
      : 'No roll was needed.';
    await showScene(result.state, result.nextNodeId, choice.text, outcome, runId);
  }

  async function onCustom() {
    const action = custom.trim();
    if (!action || busy) return;
    Keyboard.dismiss();
    const runId = ++operationId.current;
    setCustom('');
    setBusy(true);
    const result = resolveCustomAction(state, action);
    if (!result) {
      setBusy(false);
      return;
    }
    setLastRoll(result.roll ? { ...result.roll, dc: result.roll.dc || 13 } : null);
    setState(result.state);
    const roll = result.roll;
    const outcome = roll
      ? 'D20 ' + roll.raw + ' + ' + roll.modifier + ' = ' + roll.total + ' against DC ' + roll.dc + ': ' + roll.outcome.replace(/_/g, ' ') + '.'
      : 'No roll was required.';
    const sourceScene = node?.scene || sceneText;
    const savedConfig = config;

    try {
      if (result.state.health === 'Dead' || result.state.sanity === 'Lost') {
        const ending = getCurrentNode(result.state);
        if (runId === operationId.current) setSceneText(ending?.scene || 'The record ends here.');
        return;
      }
      if (savedConfig.aiEnabled && savedConfig.apiKey.trim()) {
        setSceneText('The scene holds still for a moment as the consequences take shape…');
        const aiResult = await narrateFreeform(sourceScene, action, outcome, savedConfig.apiKey, savedConfig.model, {
          ...result.state,
          nodeId: state.nodeId
        }, savedConfig.provider, savedConfig.endpoint, {
          storyStyle: activeStoryStyle,
          customPremise: savedConfig.customPremise
        });
        if (runId !== operationId.current) return;
        let nextNodeId = aiResult.nextNodeId || result.state.nodeId;
        if (result.state.health === 'Dead') nextNodeId = 'ending_dead';
        if (result.state.sanity === 'Lost') nextNodeId = 'ending_lost';
        const nextState = { ...result.state, nodeId: nextNodeId };
        const history = [...nextState.history];
        if (history.length) history[history.length - 1] = { ...history[history.length - 1], nodeId: nextNodeId };
        nextState.history = history;
        setState(nextState);
        setSceneText(aiResult.text);
      } else {
        let nextText;
        if (result.matchedChoice) {
          nextText = getCurrentNode(result.state)?.scene || 'The path ends here.';
        } else {
          const consequence = !roll
            ? 'You act, but the surroundings give no immediate answer. Something about the silence has changed.'
            : ['success', 'critical_success'].includes(roll.outcome)
              ? 'You make meaningful progress. A detail you might have missed becomes clear, opening a new possibility.'
              : roll.outcome === 'partial_success'
                ? 'You make some progress, but it costs time or exposes you to a new complication.'
                : 'The attempt fails or creates a complication. The place seems to react to the effort, and the safest route is no longer obvious.';
          nextText = 'You attempt: ' + action + '\n\n' + outcome + '\n\n' + consequence + '\n\n' + (getCurrentNode(result.state)?.scene || sourceScene);
        }
        if (runId === operationId.current) setSceneText(nextText);
      }
    } catch (error) {
      if (runId === operationId.current) {
        setSceneText((getCurrentNode(result.state)?.scene || sourceScene) + '\n\n[AI narration failed. The game remains playable. ' + readableError(error, config.apiKey) + ']');
      }
    } finally {
      if (runId === operationId.current) setBusy(false);
    }
  }

  async function restart() {
    const runId = ++operationId.current;
    Keyboard.dismiss();
    const fresh = createInitialState();
    const style = config.storyStyle === 'random' ? chooseRandomStyle() : config.storyStyle;
    setActiveStoryStyle(style);
    setState(fresh);
    setCustom('');
    setLastRoll(null);
    setBusy(false);
    setAiStatus('');
    setSceneText(openingFor(style));

    if (config.aiEnabled && config.apiKey.trim()) {
      setBusy(true);
      setSceneText('Writing a new opening…');
      try {
        const generated = await generateOpening(
          openingFor(style),
          config.apiKey,
          config.model,
          config.provider,
          config.endpoint,
          style,
          config.customPremise
        );
        if (runId === operationId.current) setSceneText(generated);
      } catch (error) {
        if (runId === operationId.current) {
          setSceneText(openingFor(style) + '\n\n[Using the built-in opening because AI generation failed. ' + readableError(error, config.apiKey) + ']');
        }
      } finally {
        if (runId === operationId.current) setBusy(false);
      }
    }
  }

  async function testAI() {
    if (testing) return;
    if (!draftConfig.apiKey.trim()) {
      setAiStatus('Enter your provider API key first.');
      return;
    }
    const selectedModel = customModelMode ? customModelText.trim() : draftConfig.model.trim();
    if (!selectedModel) {
      setAiStatus('Choose a model ID first.');
      return;
    }
    setTesting(true);
    setAiStatus('Testing connection (18-second limit)…');
    try {
      const responseText = await testConnection(
        draftConfig.apiKey,
        selectedModel,
        draftConfig.provider,
        draftConfig.endpoint
      );
      setAiStatus('Connection successful. ' + (responseText || 'The model returned a response.'));
    } catch (error) {
      setAiStatus('Connection failed: ' + readableError(error, draftConfig.apiKey));
    } finally {
      setTesting(false);
    }
  }

  const healthLevel = ({ Full: 4, Hurt: 3, Critical: 1, Dead: 0 })[state.health] ?? 0;
  const sanityLevel = ({ Steady: 4, Rattled: 3, Breaking: 1, Lost: 0 })[state.sanity] ?? 0;
  const modelOptions = modelsFor(draftConfig.provider);
  const selectedModelLabel = customModelMode
    ? 'Custom model ID'
    : (modelOptions.find(item => item.value === draftConfig.model)?.label || draftConfig.model || 'Choose model');
  const selectedStyleLabel = STORY_STYLES.find(item => item.value === draftConfig.storyStyle)?.label || 'Randomize on every new story';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.masthead}>
            <Text style={styles.eyebrow}>FIELD NOTES · UNKNOWN LOCATION</Text>
            <Text style={styles.title}>THE DARK BELOW</Text>
            <Text style={styles.subtitle}>A survival record. Every choice leaves a mark.</Text>
            <Text style={styles.styleStamp}>CURRENT TONE / {activeStoryStyle.toUpperCase()}</Text>
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => showSettings ? setShowSettings(false) : openSettings()} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{showSettings ? 'Close settings' : 'AI & story settings'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={restart} style={styles.smallButton} disabled={false}>
              <Text style={styles.smallButtonText}>New story</Text>
            </TouchableOpacity>
          </View>

          {!showSettings && !!aiStatus && <Text style={styles.aiStatus}>{aiStatus}</Text>}

          {showSettings && <View style={styles.settings}>
            <Text style={styles.panelTitle}>NARRATIVE ENGINE</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.label}>Use live AI narrator</Text>
                <Text style={styles.hint}>AI adds original consequences and can interpret freeform actions. The built-in game remains playable offline.</Text>
              </View>
              <Switch value={draftConfig.aiEnabled} onValueChange={value => setDraftConfig(previous => ({ ...previous, aiEnabled: value }))} />
            </View>

            <Text style={styles.label}>AI provider</Text>
            <View style={styles.providerRow}>
              {[
                { id: 'google', label: 'Google Gemini' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'compatible', label: 'Compatible API' }
              ].map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => chooseProvider(item.id)}
                  style={[styles.providerButton, draftConfig.provider === item.id && styles.providerButtonActive]}
                >
                  <Text style={styles.smallButtonText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>API key (kept in memory for this session)</Text>
            <TextInput
              style={styles.input}
              value={draftConfig.apiKey}
              onChangeText={value => setDraftConfig(previous => ({ ...previous, apiKey: value }))}
              placeholder={draftConfig.provider === 'google' ? 'Google AI Studio API key' : draftConfig.provider === 'openrouter' ? 'OpenRouter API key' : 'Provider API key'}
              placeholderTextColor="#777"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
              returnKeyType="done"
            />

            <Text style={styles.label}>Model</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setModelDropdownOpen(value => !value)}>
              <Text style={styles.dropdownButtonText}>{selectedModelLabel}</Text>
              <Text style={styles.dropdownArrow}>{modelDropdownOpen ? '−' : '▾'}</Text>
            </TouchableOpacity>
            {modelDropdownOpen && <View style={styles.dropdownMenu}>
              {modelOptions.map(item => (
                <TouchableOpacity key={item.value} style={[styles.dropdownOption, draftConfig.model === item.value && styles.dropdownOptionSelected]} onPress={() => chooseModel(item.value)}>
                  <Text style={styles.dropdownOptionText}>{item.label}</Text>
                  {draftConfig.model === item.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>}
            {customModelMode && <TextInput
              style={styles.input}
              value={customModelText}
              onChangeText={setCustomModelText}
              placeholder="Enter exact model ID"
              placeholderTextColor="#777"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />}

            {draftConfig.provider === 'compatible' && <>
              <Text style={styles.label}>Chat Completions endpoint</Text>
              <TextInput
                style={styles.input}
                value={draftConfig.endpoint}
                onChangeText={value => setDraftConfig(previous => ({ ...previous, endpoint: value }))}
                placeholder="https://api.openai.com/v1/chat/completions"
                placeholderTextColor="#777"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>}

            <Text style={styles.label}>Story style</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setStyleDropdownOpen(value => !value)}>
              <Text style={styles.dropdownButtonText}>{selectedStyleLabel}</Text>
              <Text style={styles.dropdownArrow}>{styleDropdownOpen ? '−' : '▾'}</Text>
            </TouchableOpacity>
            {styleDropdownOpen && <View style={styles.dropdownMenu}>
              {STORY_STYLES.map(item => (
                <TouchableOpacity key={item.value} style={[styles.dropdownOption, draftConfig.storyStyle === item.value && styles.dropdownOptionSelected]} onPress={() => {
                  setDraftConfig(previous => ({ ...previous, storyStyle: item.value }));
                  setStyleDropdownOpen(false);
                }}>
                  <Text style={styles.dropdownOptionText}>{item.label}</Text>
                  {draftConfig.storyStyle === item.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>}
            <Text style={styles.hint}>Random mode chooses a different tone and opening for each new story. Story-style changes take effect when you start a new story. A custom premise guides the AI opening and later consequences; without AI, the built-in game remains playable.</Text>

            <Text style={styles.label}>Custom premise or story direction (optional)</Text>
            <TextInput
              style={[styles.input, styles.premiseInput]}
              value={draftConfig.customPremise}
              onChangeText={value => setDraftConfig(previous => ({ ...previous, customPremise: value.slice(0, 500) }))}
              placeholder="Example: the passage belongs to a sealed 1920s observatory, and the stars outside are moving incorrectly."
              placeholderTextColor="#777"
              autoCapitalize="sentences"
              autoCorrect
              multiline
              maxLength={500}
              textAlignVertical="top"
              blurOnSubmit={false}
            />
            <Text style={styles.characterCount}>{draftConfig.customPremise.length}/500</Text>

            <TouchableOpacity style={[styles.testButton, testing && styles.buttonDisabled]} onPress={testAI} disabled={testing}>
              {testing ? <ActivityIndicator color="#f0e4cb" /> : <Text style={styles.testButtonText}>TEST AI CONNECTION</Text>}
              {testing && <Text style={styles.testButtonText}>Testing…</Text>}
            </TouchableOpacity>
            {!!aiStatus && <Text style={styles.aiStatus}>{aiStatus}</Text>}
            <Text style={styles.hint}>The connection test has an 18-second timeout. API requests time out instead of locking the game. Free-tier quotas or charges depend on your provider and account plan. API keys are not saved to GitHub or persistent storage. A client-side key can be extracted from an installed app, so keep this for personal use.</Text>

            <View style={styles.settingsActions}>
              <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                <Text style={styles.saveButtonText}>SAVE & CLOSE SETTINGS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSettings(false)}>
                <Text style={styles.cancelButtonText}>Discard edits</Text>
              </TouchableOpacity>
            </View>
          </View>}

          <View style={styles.statusPanel}>
            <View style={styles.statCard}>
              <View style={styles.statHeading}><Text style={styles.statGlyph}>♥</Text><Text style={styles.statLabel}>VITALITY</Text></View>
              <Text style={styles.statValue}>{state.health.toUpperCase()}</Text>
              <View style={styles.meter}>{[0, 1, 2, 3].map(i => <View key={i} style={[styles.meterSegment, i < healthLevel && styles.healthOn]} />)}</View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeading}><Text style={styles.sanityGlyph}>◉</Text><Text style={styles.statLabel}>SANITY</Text></View>
              <Text style={styles.statValue}>{state.sanity.toUpperCase()}</Text>
              <View style={styles.meter}>{[0, 1, 2, 3].map(i => <View key={i} style={[styles.meterSegment, i < sanityLevel && styles.sanityOn]} />)}</View>
            </View>
          </View>

          {!!state.inventory.length && <Text style={styles.inventory}>CARRIED: {state.inventory.join('  ·  ').toUpperCase()}</Text>}

          {lastRoll && <View style={styles.rollPanel}>
            <Text style={styles.rollEyebrow}>FATE / D20 CHECK</Text>
            <View style={styles.rollRow}>
              <View style={styles.dieWrap}><Text style={styles.die}>D20</Text><Text style={styles.dieCaption}>THE DRAW</Text></View>
              <View style={styles.rollNumbers}>
                <Text style={styles.rollTotal}>{lastRoll.total}</Text>
                <Text style={styles.rollFormula}>ROLL {lastRoll.raw} {lastRoll.modifier >= 0 ? '+' : '−'} {Math.abs(lastRoll.modifier || 0)} · TARGET {lastRoll.dc}</Text>
              </View>
            </View>
            <Text style={styles.rollOutcome}>{String(lastRoll.outcome || 'resolved').replace(/_/g, ' ').toUpperCase()}</Text>
            <View style={styles.rollMeter}>{[0, 1, 2, 3, 4].map(i => <View key={i} style={[styles.rollMeterSegment, (lastRoll.outcome === 'critical_success' ? i < 5 : lastRoll.outcome === 'success' ? i < 4 : lastRoll.outcome === 'partial_success' ? i < 3 : i < 1) && styles.rollMeterOn]} />)}</View>
          </View>}

          <View style={styles.sceneFrame}>
            <Text style={styles.sceneKicker}>TRANSCRIPTION / {String(state.nodeId || 'UNKNOWN').replace(/_/g, ' ').toUpperCase()}</Text>
            {busy && <View style={styles.thinkingRow}><ActivityIndicator size="small" color="#8a6b3f" /><Text style={styles.thinkingText}>{config.aiEnabled ? 'Narrating consequences…' : 'Updating the record…'}</Text></View>}
            <Text style={styles.scene}>{sceneText}</Text>
          </View>

          {node?.choices?.map((choice, i) => (
            <TouchableOpacity key={i} style={[styles.choice, busy && styles.choiceDisabled]} onPress={() => onChoice(choice)} disabled={busy}>
              <Text style={styles.choiceIndex}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.choiceText}>{choice.text}</Text>
              <Text style={styles.choiceArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {node?.choices?.length > 0 ? <>
            <Text style={styles.label}>YOUR ACTION</Text>
            <Text style={styles.hint}>Try an action that is not listed. Dice determine risk; AI can describe the result and choose a valid destination.</Text>
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                placeholder="What do you do?"
                placeholderTextColor="#817766"
                value={custom}
                onChangeText={setCustom}
                editable={!busy}
                returnKeyType="send"
                onSubmitEditing={onCustom}
                blurOnSubmit
                autoCorrect
              />
              <TouchableOpacity style={[styles.customBtn, (busy || !custom.trim()) && styles.buttonDisabled]} onPress={onCustom} disabled={busy || !custom.trim()}>
                <Text style={styles.customBtnText}>{busy ? '…' : 'ACT'}</Text>
              </TouchableOpacity>
            </View>
          </> : <Text style={styles.endingNote}>THE RECORD ENDS HERE. Start a new story to enter again.</Text>}

          <Text style={styles.footer}>AI is optional. Choices, dice, health and sanity are handled locally; narrative requests have a hard timeout and built-in fallback.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#11100e' },
  scroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 42, flexGrow: 1 },
  masthead: { backgroundColor: '#1b1916', borderWidth: 1, borderColor: '#514638', padding: 17, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 8 },
  eyebrow: { color: '#a58d66', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 7 },
  title: { color: '#e8ddc7', fontSize: 26, fontWeight: '900', letterSpacing: 1.8 },
  subtitle: { color: '#a99d88', fontSize: 12, marginTop: 6, lineHeight: 18 },
  styleStamp: { color: '#987d54', fontSize: 9, fontWeight: '800', letterSpacing: 1.25, marginTop: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#393228' },
  toolbar: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  smallButton: { flex: 1, backgroundColor: '#2a2620', paddingVertical: 11, paddingHorizontal: 10, borderRadius: 3, borderWidth: 1, borderColor: '#61513a', alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: '#e5d8bf', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  settings: { backgroundColor: '#1b1916', padding: 14, borderRadius: 3, marginBottom: 18, borderWidth: 1, borderColor: '#796143' },
  panelTitle: { color: '#c6a875', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#393228', paddingBottom: 12, marginBottom: 8 },
  switchTextWrap: { flex: 1 },
  label: { color: '#d8cbb4', fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  hint: { color: '#a39987', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  input: { backgroundColor: '#12110f', color: '#eee2cc', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 3, borderWidth: 1, borderColor: '#544733', minHeight: 44, fontSize: 14 },
  premiseInput: { minHeight: 84, maxHeight: 140 },
  characterCount: { color: '#817867', fontSize: 10, textAlign: 'right', marginTop: 3 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  providerButton: { backgroundColor: '#27231e', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 3, borderWidth: 1, borderColor: '#4b4134' },
  providerButtonActive: { backgroundColor: '#51412c', borderColor: '#c5a56a' },
  dropdownButton: { backgroundColor: '#12110f', borderWidth: 1, borderColor: '#8b7045', minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 3 },
  dropdownButtonText: { color: '#eee2cc', fontSize: 13, flex: 1, paddingRight: 10 },
  dropdownArrow: { color: '#d1b17a', fontSize: 18, fontWeight: '900' },
  dropdownMenu: { marginTop: 3, backgroundColor: '#15130f', borderWidth: 1, borderColor: '#514638' },
  dropdownOption: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#2c2821' },
  dropdownOptionSelected: { backgroundColor: '#31291e' },
  dropdownOptionText: { color: '#ded0b6', flex: 1, fontSize: 12 },
  checkmark: { color: '#d1b17a', fontWeight: '900', marginLeft: 10 },
  testButton: { backgroundColor: '#5a472d', borderColor: '#b59863', borderWidth: 1, minHeight: 44, paddingHorizontal: 11, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginVertical: 9 },
  buttonDisabled: { opacity: 0.48 },
  testButtonText: { color: '#f0e4cb', fontWeight: '800', letterSpacing: 0.8, fontSize: 12 },
  aiStatus: { color: '#e2c792', fontSize: 12, lineHeight: 18, marginBottom: 8, padding: 10, backgroundColor: '#282219', borderLeftWidth: 2, borderLeftColor: '#af8c51' },
  settingsActions: { gap: 8, marginTop: 8 },
  saveButton: { backgroundColor: '#77603a', borderWidth: 1, borderColor: '#d5b981', padding: 13, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#fff2d5', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  cancelButton: { padding: 10, alignItems: 'center' },
  cancelButtonText: { color: '#a59a86', fontSize: 12, textDecorationLine: 'underline' },
  statusPanel: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#211e19', borderWidth: 1, borderColor: '#62513a', padding: 12 },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statGlyph: { color: '#b56d61', fontSize: 18, fontWeight: '900' },
  sanityGlyph: { color: '#b5a3d2', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#b8a98e', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  statValue: { color: '#eee1c7', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 7, marginBottom: 10 },
  meter: { flexDirection: 'row', gap: 4 },
  meterSegment: { flex: 1, height: 7, backgroundColor: '#494239', borderWidth: 1, borderColor: '#625543' },
  healthOn: { backgroundColor: '#a34f43', borderColor: '#c77c68' },
  sanityOn: { backgroundColor: '#8270a2', borderColor: '#b1a0d0' },
  inventory: { color: '#b5a588', fontSize: 10, letterSpacing: 1.2, marginBottom: 14 },
  rollPanel: { backgroundColor: '#1d1a16', borderWidth: 1, borderColor: '#8b7045', padding: 14, marginBottom: 14 },
  rollEyebrow: { color: '#c2a36d', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dieWrap: { alignItems: 'center' },
  die: { color: '#e4d2ad', fontSize: 22, fontWeight: '900', borderWidth: 1, borderColor: '#9d8151', padding: 10, textAlign: 'center' },
  dieCaption: { color: '#8d7b5d', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  rollNumbers: { flex: 1 },
  rollTotal: { color: '#f0e0bf', fontSize: 30, fontWeight: '900' },
  rollFormula: { color: '#a99a80', fontSize: 10, letterSpacing: 0.8, marginTop: 2 },
  rollOutcome: { color: '#d5bd8b', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  rollMeter: { flexDirection: 'row', gap: 4, marginTop: 9 },
  rollMeterSegment: { flex: 1, height: 5, backgroundColor: '#494239', borderWidth: 1, borderColor: '#625543' },
  rollMeterOn: { backgroundColor: '#a98a54', borderColor: '#d2b67f' },
  sceneFrame: { backgroundColor: '#d5c6a6', borderColor: '#7e6b4d', borderWidth: 2, padding: 16, marginBottom: 17, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 8 },
  sceneKicker: { color: '#766348', fontSize: 9, fontWeight: '900', letterSpacing: 1.35, marginBottom: 11 },
  scene: { color: '#29251f', fontSize: 16, lineHeight: 25 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  thinkingText: { color: '#765c36', fontSize: 11, fontWeight: '700' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#24211c', borderRadius: 2, paddingVertical: 13, paddingHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: '#5c4d39', minHeight: 52 },
  choiceDisabled: { opacity: 0.5 },
  choiceIndex: { color: '#aa8b58', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  choiceText: { color: '#e5d8bf', fontSize: 14, lineHeight: 21, flex: 1 },
  choiceArrow: { color: '#bba071', fontSize: 23, marginLeft: 3 },
  customRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 4 },
  customInput: { flex: 1, backgroundColor: '#181613', color: '#eee2cc', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 3, borderWidth: 1, borderColor: '#63513a', minHeight: 48, fontSize: 14 },
  customBtn: { backgroundColor: '#6a5435', borderRadius: 3, paddingHorizontal: 17, justifyContent: 'center', borderWidth: 1, borderColor: '#b08e57', minWidth: 66, alignItems: 'center' },
  customBtnText: { color: '#f5e8cd', fontWeight: '900', letterSpacing: 0.8 },
  endingNote: { color: '#b9a78a', fontSize: 12, lineHeight: 18, padding: 14, backgroundColor: '#201d18', borderWidth: 1, borderColor: '#514638' },
  footer: { color: '#817867', fontSize: 11, lineHeight: 17, marginTop: 24 },
});
