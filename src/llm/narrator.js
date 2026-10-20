import { MAP } from '../game/map';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function prompts(scene, action, outcome) {
  const system = 'You are a grounded, slow-burn horror game master. Write in second person, present tense. Make the world responsive to the player action. Preserve established facts, inventory, injuries, and previous events. Do not decide dice outcomes or claim an action succeeded if the supplied result says otherwise. Do not offer choices in place of narration. Keep under 160 words.';
  const user = 'Current scene: ' + scene + '\nPlayer action: ' + (action || 'Continue the scene') + '\nRules result: ' + (outcome || 'No dice roll') + '\nNarrate what happens next. If the action cannot reasonably work, describe the obstacle and a plausible consequence.';
  return { system, user };
}

async function requestText(system, user, apiKey, model, provider, endpoint, maxTokens, jsonMode) {
  const key = apiKey && apiKey.trim();
  if (!key) throw new Error('Missing API key');
  let url, headers, body;
  if (provider === 'google') {
    const modelId = (model || 'gemini-2.5-flash').trim().replace(/^models\//, '');
    url = GEMINI_URL + '/' + encodeURIComponent(modelId) + ':generateContent';
    headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) }
    };
  } else {
    url = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : (endpoint || '').trim();
    if (!/^https?:\/\//i.test(url)) throw new Error('Endpoint must be a valid HTTP(S) URL');
    headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
    body = {
      model: (model || (provider === 'openrouter' ? 'openrouter/free' : 'gpt-4o-mini')).trim(),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    };
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data && data.error && data.error.message) || (data && data.message) || ('HTTP ' + response.status);
    throw new Error(message);
  }
  if (provider === 'google') {
    const candidate = data && data.candidates && data.candidates[0];
    const text = (candidate && candidate.content && candidate.content.parts || [])
      .map(part => part.text || '').join('').trim();
    if (!text) {
      const blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
      const finishReason = candidate && candidate.finishReason;
      throw new Error(blockReason ? 'Google blocked this prompt: ' + blockReason : finishReason ? 'Google returned no text (finish reason: ' + finishReason + ').' : 'Google returned an empty response. Check the model ID and API key permissions.');
    }
    return text;
  }
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    ? data.choices[0].message.content.trim() : '';
  if (!text) throw new Error('The API returned no message content. Check the model ID and endpoint.');
  return text;
}

function unavailable(scene, error) {
  const detail = error ? ' Details: ' + String(error).replace(/https?:\/\/\S+/g, '[URL]').slice(0, 240) : '';
  return scene + '\n\n(AI unavailable; continuing with the written story.' + detail + ')';
}

export async function narrate(scene, action, outcome, apiKey, model = 'gemini-2.5-flash', provider = 'google', endpoint = 'https://api.openai.com/v1/chat/completions') {
  if (!apiKey || !apiKey.trim()) return scene;
  const p = prompts(scene, action, outcome);
  try {
    return await requestText(p.system, p.user, apiKey, model, provider, endpoint, 300, false) || scene;
  } catch (error) {
    return unavailable(scene, error && error.message);
  }
}

/**
 * The AI may choose a valid destination for a freeform action, but it cannot
 * invent node IDs or overwrite the deterministic dice/state engine.
 */
export async function narrateFreeform(scene, action, outcome, apiKey, model = 'gemini-2.5-flash', state = {}, provider = 'google', endpoint = 'https://api.openai.com/v1/chat/completions') {
  const fallback = { text: unavailable(scene), nextNodeId: state.nodeId };
  if (!apiKey || !apiKey.trim()) return { text: scene, nextNodeId: state.nodeId };
  const validNodeIds = Object.keys(MAP);
  const system = 'You are the game master for a branching, slow-burn horror adventure. Respond ONLY as one valid JSON object with exactly two keys: "narration" (string, 40-150 words, second person present tense) and "nextNodeId" (one string chosen exactly from the provided valid node IDs). Choose the most appropriate next location based on the player action and current situation. You may keep the player in the current node if the action would not change location. Never claim the dice result is different from the supplied result. Do not invent items, injuries, or facts. Do not include Markdown fences.';
  const user = JSON.stringify({
    scene, playerAction: action, rulesOutcome: outcome,
    currentState: { location: state.nodeId, health: state.health, sanity: state.sanity, inventory: state.inventory || [], recentHistory: (state.history || []).slice(-5) },
    validNodeIds
  });
  try {
    const raw = await requestText(system, user, apiKey, model, provider, endpoint, 400, true);
    if (!raw) return fallback;
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return { text: raw.slice(0, 1200), nextNodeId: state.nodeId };
      parsed = JSON.parse(match[0]);
    }
    const narration = typeof parsed.narration === 'string' ? parsed.narration.trim() : '';
    const nextNodeId = validNodeIds.includes(parsed.nextNodeId) ? parsed.nextNodeId : state.nodeId;
    return { text: narration.slice(0, 1600) || fallback.text, nextNodeId };
  } catch (error) {
    return { text: unavailable(scene, error && error.message), nextNodeId: state.nodeId };
  }
}

export async function testConnection(apiKey, model = 'gemini-2.5-flash', provider = 'google', endpoint = 'https://api.openai.com/v1/chat/completions') {
  const text = await requestText(
    'You are a connection test. Reply with only the words: Connection successful.',
    'Reply with: Connection successful.',
    apiKey, model, provider, endpoint, 30, false
  );
  return text;
}
