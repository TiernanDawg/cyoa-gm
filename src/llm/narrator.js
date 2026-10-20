const URL = 'https://openrouter.ai/api/v1/chat/completions';
export async function narrate(scene, action, outcome, apiKey, model = 'openrouter/free') {
  if (!apiKey?.trim()) return scene;
  const system = `You are a grounded, slow-burn horror game master. Write in second person, present tense. Make the world responsive to the player's declared action. Preserve established facts, inventory, injuries, and previous events. Do not decide dice outcomes or claim an action succeeded if the supplied result says otherwise. Do not offer choices in place of narration. Keep under 160 words.`;
  const user = `Current scene: ${scene}\nPlayer action: ${action || 'Continue the scene'}\nRules result: ${outcome || 'No dice roll'}\nNarrate what happens next. If the action cannot reasonably work, describe the obstacle and a plausible consequence.`;
  try {
    const r = await fetch(URL, { method:'POST', headers:{Authorization:`Bearer ${apiKey.trim()}`,'Content-Type':'application/json'}, body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:0.8,max_tokens:300}) });
    if (!r.ok) return scene + '\n\n(AI unavailable; continuing with the written story.)';
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() || scene;
  } catch { return scene + '\n\n(AI unavailable; continuing with the written story.)'; }
}
