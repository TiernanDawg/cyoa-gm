import { MAP } from '../game/map';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GOOGLE_MODEL = 'gemini-3.8-flash';
const DEFAULT_REQUEST_TIMEOUT_MS = 18000;

function cleanErrorMessage(error, apiKey) {
  let message = error && error.message ? String(error.message) : String(error || 'Unknown error');
  if (apiKey) message = message.split(apiKey).join('[API key hidden]');
  return message.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 260);
}

function prompts(scene, action, outcome, context = {}) {
  const style = context.storyStyle || 'Slow-burn dark folktale';
  const premise = context.customPremise || 'An underground passage whose layout and history seem to change when unobserved.';
  const currentState = {
    location: context.nodeId || 'unknown',
    health: context.health || 'Full',
    sanity: context.sanity || 'Steady',
    inventory: context.inventory || [],
    recentHistory: (context.history || []).slice(-4).map(item => ({
      action: item.action,
      outcome: item.outcome,
      location: item.nodeId
    }))
  };
  const system = [
    'You are the responsive narrative engine for a mobile, choice-driven horror adventure.',
    'Write in second person and present tense, with concrete sensory detail and coherent cause-and-effect.',
    'After an action, explain what physically happens, what the player notices, how the environment reacts, and what new risk or opportunity becomes clear.',
    'Aim for 100–170 words for a meaningful action, and 50–90 words for a small action. Do not pad with vague ominous phrases.',
    'Preserve established locations, inventory, injuries, sanity, prior events, and the supplied dice outcome.',
    'Never contradict the supplied rules result, invent a successful outcome after a failure, or grant items not already awarded by the rules.',
    'Do not list choices or speak to the player out of character. End on an actionable detail, discovery, or consequence.',
    'Follow the selected story style and custom premise without breaking physical continuity.'
  ].join(' ');
  const user = [
    'STORY STYLE: ' + style,
    'PLAYER STORY BRIEF: ' + premise,
    'CURRENT SCENE: ' + scene,
    'PLAYER ACTION: ' + (action || 'Continue the scene'),
    'RULES RESULT (authoritative): ' + (outcome || 'No dice roll was required.'),
    'CURRENT GAME STATE: ' + JSON.stringify(currentState),
    'Write the next passage. Describe the consequence of this exact action in a specific, detailed way. Do not repeat the scene verbatim.'
  ].join('\n\n');
  return { system, user };
}

async function requestText(system, user, apiKey, model, provider, endpoint, maxTokens, jsonMode, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const key = apiKey && apiKey.trim();
  if (!key) throw new Error('Missing API key. Open AI Settings and enter a key for the selected provider.');

  let url, headers, body;
  if (provider === 'google') {
    const modelId = (model || DEFAULT_GOOGLE_MODEL).trim().replace(/^models\//, '');
    if (!modelId) throw new Error('Select a Gemini model.');
    url = GEMINI_URL + '/' + encodeURIComponent(modelId) + ':generateContent';
    headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        ...(modelId.startsWith('gemini-3.') ? { thinkingConfig: { thinkingLevel: 'low' } } : {})
      }
    };
  } else {
    url = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : (endpoint || '').trim();
    if (!/^https?:\/\/\S+/i.test(url)) throw new Error('Endpoint must be a valid HTTP(S) URL.');
    const modelId = (model || (provider === 'openrouter' ? 'openrouter/free' : 'gpt-4o-mini')).trim();
    if (!modelId) throw new Error('Select a model.');
    headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/TiernanDawg/cyoa-gm';
      headers['X-Title'] = 'CYOA GM';
    }
    body = {
      model: modelId,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.8,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (controller) controller.abort();
      reject(new Error('AI request timed out after ' + Math.round(timeoutMs / 1000) + ' seconds. The app is ready to continue; check your connection, model ID, and provider quota.'));
    }, timeoutMs);
  });

  let response;
  let rawBody = '';
  try {
    const fetchAndReadPromise = (async () => {
      const fetched = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {})
      });
      const bodyText = await fetched.text();
      return { fetched, bodyText };
    })();
    const result = await Promise.race([fetchAndReadPromise, timeoutPromise]);
    response = result.fetched;
    rawBody = result.bodyText;
  } catch (error) {
    if (error && error.message && /timed out after/.test(error.message)) throw error;
    if (error && error.name === 'AbortError') throw new Error('AI request was cancelled or timed out. You can keep playing; check your connection and try again.');
    throw new Error('Network request failed. Check your internet connection and provider endpoint, then try again.');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  let data = {};
  try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { /* handled below with a useful response error */ }
  if (!response.ok) {
    const message = data && data.error && (data.error.message || data.error.status)
      ? (data.error.message || data.error.status)
      : data && data.message ? data.message
      : rawBody ? rawBody.slice(0, 180) : ('HTTP ' + response.status);
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication was rejected. Verify that this key belongs to ' + (provider === 'google' ? 'Google AI Studio/Gemini' : provider === 'openrouter' ? 'OpenRouter' : 'the selected endpoint') + ' and has API access. ' + message);
    }
    if (response.status === 404) throw new Error('Model or API endpoint was not found. Check the model dropdown and provider. ' + message);
    if (response.status === 429) throw new Error('Provider rate limit or free quota reached. Wait a little, check the quota, or choose another available model. ' + message);
    throw new Error(message);
  }
  if (!data || typeof data !== 'object') throw new Error('The API returned a response that was not valid JSON.');

  if (provider === 'google') {
    const candidate = data.candidates && data.candidates[0];
    const text = (candidate && candidate.content && candidate.content.parts || [])
      .map(part => part.text || '').join('').trim();
    if (!text) {
      const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
      const finishReason = candidate && candidate.finishReason;
      throw new Error(blockReason
        ? 'Google blocked this prompt: ' + blockReason
        : finishReason
          ? 'Google returned no story text (finish reason: ' + finishReason + '). Try a shorter custom premise or another model.'
          : 'Google returned an empty response. Check the model ID, key permissions, and available API quota.');
    }
    return text;
  }

  const message = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content : '';
  const text = Array.isArray(message)
    ? message.map(part => typeof part === 'string' ? part : part && part.text || '').join('').trim()
    : typeof message === 'string' ? message.trim() : '';
  if (!text) throw new Error('The API returned no message content. Check the model ID, endpoint, and provider quota.');
  return text;
}

function unavailable(scene, error, apiKey) {
  const detail = error ? ' Details: ' + cleanErrorMessage(error, apiKey) : '';
  return scene + '\n\n[AI narration unavailable. The written story is still playable.' + detail + ']';
}

export async function narrate(
  scene,
  action,
  outcome,
  apiKey,
  model = DEFAULT_GOOGLE_MODEL,
  provider = 'google',
  endpoint = 'https://api.openai.com/v1/chat/completions',
  context = {}
) {
  if (!apiKey || !apiKey.trim()) return scene;
  const p = prompts(scene, action, outcome, context);
  try {
    const generated = await requestText(p.system, p.user, apiKey, model, provider, endpoint, 520, false);
    return generated || scene;
  } catch (error) {
    return unavailable(scene, error && error.message, apiKey);
  }
}

/**
 * AI can select an existing destination node and narrate a freeform action.
 * The local rules engine remains authoritative for dice, health, sanity and inventory.
 */
export async function narrateFreeform(
  scene,
  action,
  outcome,
  apiKey,
  model = DEFAULT_GOOGLE_MODEL,
  state = {},
  provider = 'google',
  endpoint = 'https://api.openai.com/v1/chat/completions',
  storyContext = {}
) {
  const fallback = {
    text: unavailable(scene, 'Freeform narration could not be generated.', apiKey),
    nextNodeId: state.nodeId
  };
  if (!apiKey || !apiKey.trim()) return { text: scene, nextNodeId: state.nodeId };

  const validNodeIds = Object.keys(MAP);
  const system = [
    'You are the interactive game master for a slow-burn horror adventure.',
    'Respond ONLY with one valid JSON object with exactly two keys: "narration" and "nextNodeId".',
    '"narration" must be an original 90–170 word passage, second person present tense, explaining the immediate result of the player action in concrete sensory detail.',
    '"nextNodeId" must be exactly one string from the supplied valid node IDs.',
    'Preserve the authoritative rules result and current health, sanity, inventory and history. Never invent an item or reverse a failure.',
    'Keep the player at the current location unless the action plausibly moves them somewhere represented by a valid node.',
    'Do not give a menu of choices, markdown fences, or any text outside the JSON object.'
  ].join(' ');
  const user = JSON.stringify({
    storyStyle: storyContext.storyStyle || 'Slow-burn dark folktale',
    customPremise: storyContext.customPremise || '',
    scene,
    playerAction: action,
    rulesOutcome: outcome,
    currentState: {
      location: state.nodeId,
      health: state.health,
      sanity: state.sanity,
      inventory: state.inventory || [],
      recentHistory: (state.history || []).slice(-5)
    },
    validNodeIds
  });

  try {
    const raw = await requestText(system, user, apiKey, model, provider, endpoint, 650, true);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('The model did not return the required story JSON. Try the connection test or select another model.');
      parsed = JSON.parse(match[0]);
    }
    const narration = typeof parsed.narration === 'string' ? parsed.narration.trim() : '';
    if (!narration) throw new Error('The model returned empty narration. Try again or select another model.');
    const nextNodeId = validNodeIds.includes(parsed.nextNodeId) ? parsed.nextNodeId : state.nodeId;
    return { text: narration.slice(0, 2600), nextNodeId };
  } catch (error) {
    return {
      text: unavailable(scene, error && error.message, apiKey),
      nextNodeId: state.nodeId
    };
  }
}

export async function generateOpening(
  baseScene,
  apiKey,
  model = DEFAULT_GOOGLE_MODEL,
  provider = 'google',
  endpoint = 'https://api.openai.com/v1/chat/completions',
  storyStyle = 'Slow-burn dark folktale',
  customPremise = ''
) {
  const system = [
    'You are writing the opening passage of a replayable mobile horror adventure.',
    'Write 120–170 words in second person present tense with vivid, restrained sensory detail.',
    'Create a distinctive, coherent opening, seed one mystery and one immediate danger, and end with a specific detail the player can act on.',
    'Keep the underlying physical layout compatible with a narrow passage, a door, a downward route and a way back.',
    'Do not add dialogue options, headings, markdown or facts about player inventory.'
  ].join(' ');
  const user = [
    'Style: ' + storyStyle,
    'Custom premise: ' + (customPremise || 'A disquieting underground passage whose layout seems to change when unobserved.'),
    'Branching map anchor: ' + baseScene,
    'Write a fresh opening variation for a new playthrough.'
  ].join('\n\n');
  return requestText(system, user, apiKey, model, provider, endpoint, 460, false);
}

export async function testConnection(
  apiKey,
  model = DEFAULT_GOOGLE_MODEL,
  provider = 'google',
  endpoint = 'https://api.openai.com/v1/chat/completions'
) {
  const text = await requestText(
    'You are a connection test. Reply with only the exact words: Connection successful.',
    'Reply with: Connection successful.',
    apiKey, model, provider, endpoint, 32, false, 12000
  );
  return text;
}
