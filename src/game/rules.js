export const HEALTH_MODIFIERS = { Full: 0, Hurt: -2, Critical: -4, Dead: null };
export const SANITY_MODIFIERS = { Steady: 0, Rattled: -1, Breaking: -3, Lost: null };
export const DC = { Trivial: 5, Easy: 10, Moderate: 13, Hard: 16, Extreme: 19 };
export function rollD20() { return Math.floor(Math.random() * 20) + 1; }
export function resolveRoll(dc, modifier = 0) {
  const raw = rollD20(), total = raw + modifier;
  if (raw === 1) return { outcome: 'critical_failure', raw, total };
  if (raw === 20) return { outcome: 'critical_success', raw, total };
  if (total >= dc) return { outcome: 'success', raw, total };
  if (total >= dc - 4) return { outcome: 'partial_success', raw, total };
  return { outcome: 'failure', raw, total };
}
