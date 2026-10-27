const assert = require('assert');
const fs = require('fs');
const rules = fs.readFileSync(require.resolve('../src/game/rules'), 'utf8');
assert(rules.includes('resolveRoll'), 'd20 resolver should exist');
assert(rules.includes('HEALTH_MODIFIERS'), 'health modifiers should exist');
assert(rules.includes('SANITY_MODIFIERS'), 'sanity modifiers should exist');
assert(rules.includes('DC'), 'difficulty targets should exist');
console.log('Basic rules source checks passed.');