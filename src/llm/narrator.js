import { MAP } from '../game/map';

const URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function narrate(scene, action, outcome, apiKey, model = 'openrouter/free') {
  if (!apiKey?.trim()) return scene;
  const system = `You are a grounded, slow-burn horror game master. Write in second person, present tense. Make the world responsive to the player's declared action. Preserve established facts, inventory, injuries, and previous events. Do not decide dice outcomes or claim an action succeeded if the supplied result says otherwise. Do not offer choices in place of narration. Keep under 160 words.`;
  const user = `Current scene: ${scene}\nPlayer action: ${action || 'Continue the scene'}\nRules result: ${outcome || 'No dice roll'}\nNarrate what happens next. If the action cannot reasonably work, describe the obstacle and a plausible consequence.`;
  try {
    const r = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.8, max_tokens: 300 })
    });
    if (!r.ok) return scene + '\n\n(AI unavailable; continuing with the written story.)';
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() || scene;
  } catch {
    return scene + '\n\n(AI unavailable; continuing with the written story.)';
  }
}

/**
 * The AI may choose a valid destination for a freeform action, but it cannot
 * invent node IDs or overwrite the deterministic dice/state engine.
 */
export async function narrateFreeform(scene, action, outcome, apiKey, model = 'openrouter/free', state = {}) {
  const fallback = { text: scene + '\\n\\n(AI unavailable; continuing with the written story.)', nextNodeId: state.nodeId };
  if (!apiKey?.trim()) return { text: scene, nextNodeId: state.nodeId };
  const validNodeIds = Object.keys(MAP);
  const system = `You are the game master for a branching, slow-burn horror adventure. Respond ONLY as one valid JSON object with exactly two keys: "narration" (string, 40-150 words, second person present tense) and "nextNodeId" (one string chosen exactly from the provided valid node IDs). Choose the most appropriate next location based on the player's action and the current situation. You may keep the player in the current node if the action would not change location. Never claim the dice result is different from the supplied result. Do not invent items, injuries, or facts. Do not include Markdown fences.`;
  const user = JSON.stringify({
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
    const r = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7, max_tokens: 400 })
    });
    if (!r.ok) return fallback;
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content?.trim();
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
  } catch {
    return fallback;
  }
}
