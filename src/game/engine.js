import { getNode } from './map';
import { resolveRoll, HEALTH_MODIFIERS, SANITY_MODIFIERS, DC } from './rules';

export function createInitialState() {
  return {
    nodeId: 'start',
    health: 'Full',
    sanity: 'Steady',
    inventory: [],
    flags: {},
    turn: 0,
    history: []
  };
}

function worsenHealth(value) {
  return value === 'Full' ? 'Hurt' : value === 'Hurt' ? 'Critical' : value === 'Critical' ? 'Dead' : 'Dead';
}
function worsenSanity(value) {
  return value === 'Steady' ? 'Rattled' : value === 'Rattled' ? 'Breaking' : value === 'Breaking' ? 'Lost' : 'Lost';
}
function applyRollConsequences(next, choice, roll) {
  if (!roll) return;
  if (roll.outcome === 'critical_failure' || roll.outcome === 'failure') {
    if (choice.stat === 'health') next.health = worsenHealth(next.health);
    else next.sanity = worsenSanity(next.sanity);
  } else if (roll.outcome === 'partial_success') {
    if (choice.stat === 'health') next.health = next.health === 'Full' ? 'Hurt' : next.health;
    else next.sanity = next.sanity === 'Steady' ? 'Rattled' : next.sanity;
  }
}

export function applyChoice(state, choice) {
  const next = {
    ...state,
    turn: state.turn + 1,
    inventory: [...state.inventory],
    flags: { ...(state.flags || {}) },
    history: [...state.history]
  };
  if (choice.effect?.item && !next.inventory.includes(choice.effect.item)) next.inventory.push(choice.effect.item);
  if (choice.effect?.flag) next.flags[choice.effect.flag] = true;
  const mod = choice.stat === 'health'
    ? (HEALTH_MODIFIERS[next.health] ?? 0)
    : (SANITY_MODIFIERS[next.sanity] ?? 0);
  const roll = choice.dc ? resolveRoll(choice.dc, mod) : null;
  applyRollConsequences(next, choice, roll);
  next.nodeId = next.health === 'Dead' ? 'ending_dead' : next.sanity === 'Lost' ? 'ending_lost' : choice.next;
  next.history.push({
    action: choice.text,
    from: state.nodeId,
    nodeId: next.nodeId,
    outcome: roll?.outcome || 'no roll',
    roll: roll ? { ...roll, dc: choice.dc, modifier: mod } : null
  });
  return { state: next, roll, nextNodeId: next.nodeId };
}

const STOP_WORDS = new Set(['the','a','an','to','and','or','i','me','my','it','on','in','at','with','for','of','do','try','want','would','like','please','then','now','just']);
function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

export function resolveCustomAction(state, rawAction) {
  const action = rawAction.trim();
  const node = getNode(state.nodeId);
  if (!node || !action) return null;
  const actionWords = new Set(words(action));
  const scored = (node.choices || []).map((choice) => {
    const choiceWords = words(choice.text);
    let score = choiceWords.reduce((sum, word) => sum + (actionWords.has(word) ? 2 : 0), 0);
    const text = action.toLowerCase();
    if (/\b(take|grab|pick up|collect|pocket)\b/.test(text) && choice.effect?.item) score += 5;
    if (/\b(listen|hear)\b/.test(text) && /listen|hear|silent|still/.test(choice.text.toLowerCase())) score += 4;
    if (/\b(run|sprint|flee|escape)\b/.test(text) && /run|scramble|escape|back away/.test(choice.text.toLowerCase())) score += 4;
    if (/\b(return|retreat|leave|back out)\b/.test(text) && /return|leave|turn back|back away|back out/.test(choice.text.toLowerCase())) score += 4;
    if (/\b(search|inspect|examine|study|look|feel)\b/.test(text) && /search|examine|study|inspect|feel|look/.test(choice.text.toLowerCase())) score += 4;
    if (/\b(enter|open|go|walk|descend|follow|continue)\b/.test(text) && /enter|open|go |walk|descend|follow|continue|take the door|take the slope/.test(choice.text.toLowerCase())) score += 3;
    return { choice, score };
  }).sort((a, b) => b.score - a.score);
  if (scored.length && scored[0].score >= 2) {
    const result = applyChoice(state, { ...scored[0].choice, text: action });
    result.state.history[result.state.history.length - 1].action = action;
    result.matchedChoice = scored[0].choice.text;
    return result;
  }

  const observation = /look|listen|search|feel|study|inspect|examine|read|smell|wait|hide|think|remember/i.test(action);
  const stat = observation ? 'sanity' : 'health';
  const mod = stat === 'health' ? (HEALTH_MODIFIERS[state.health] ?? 0) : (SANITY_MODIFIERS[state.sanity] ?? 0);
  const roll = resolveRoll(DC.Moderate, mod);
  const next = { ...state, turn: state.turn + 1, inventory: [...state.inventory], flags: { ...(state.flags || {}) }, history: [...state.history] };
  const pseudoChoice = { stat };
  applyRollConsequences(next, pseudoChoice, roll);
  if (next.health === 'Dead') next.nodeId = 'ending_dead';
  else if (next.sanity === 'Lost') next.nodeId = 'ending_lost';
  next.history.push({ action, from: state.nodeId, nodeId: next.nodeId, outcome: roll.outcome, roll: { ...roll, dc: DC.Moderate, modifier: mod } });
  return { state: next, roll, nextNodeId: next.nodeId, matchedChoice: null };
}

export function getCurrentNode(state) { return getNode(state.nodeId); }
