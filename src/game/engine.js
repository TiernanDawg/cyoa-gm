import { getNode } from './map';
import { resolveRoll, HEALTH_MODIFIERS, SANITY_MODIFIERS } from './rules';
export function createInitialState() {
  return { nodeId: 'start', health: 'Full', sanity: 'Steady', inventory: [], turn: 0, history: [] };
}
export function applyChoice(state, choice) {
  const next = { ...state, turn: state.turn + 1, inventory: [...state.inventory], history: [...state.history] };
  if (choice.effect?.item && !next.inventory.includes(choice.effect.item)) next.inventory.push(choice.effect.item);
  let roll = null;
  if (choice.dc) {
    const mod = choice.stat === 'health' ? (HEALTH_MODIFIERS[next.health] ?? 0) : (SANITY_MODIFIERS[next.sanity] ?? 0);
    roll = resolveRoll(choice.dc, mod);
    if (roll.outcome === 'critical_failure' || (roll.outcome === 'failure' && choice.stat === 'health')) {
      if (choice.stat === 'health') next.health = next.health === 'Full' ? 'Hurt' : next.health === 'Hurt' ? 'Critical' : next.health;
      else next.sanity = next.sanity === 'Steady' ? 'Rattled' : next.sanity === 'Rattled' ? 'Breaking' : next.sanity;
    } else if (roll.outcome === 'partial_success') {
      if (choice.stat === 'health') next.health = next.health === 'Full' ? 'Hurt' : next.health;
      else next.sanity = next.sanity === 'Steady' ? 'Rattled' : next.sanity;
    }
  }
  next.history.push({ action: choice.text, nodeId: choice.next, outcome: roll?.outcome || 'no roll' });
  return { state: next, roll, nextNodeId: choice.next };
}
export function getCurrentNode(state) { return getNode(state.nodeId); }
