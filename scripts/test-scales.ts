// Controlli sulle scale dei layer. Uso: npx tsx scripts/test-scales.ts
import assert from 'node:assert/strict';
import { snowRadius, tempColor, windColor, windLength } from '../src/scales';

assert.equal(tempColor(-50), '#24317a'); // fuori scala → estremo
assert.equal(tempColor(0), '#9fcde9'); // esattamente su una tappa
assert.equal(tempColor(5), '#c8d8c2'); // metà tra 0 e 10
assert.equal(tempColor(99), '#6e1712');
assert.equal(windColor(0), '#7c9a74');
assert.equal(windColor(20), '#d99a1e'); // il limite superiore appartiene alla classe successiva
assert.equal(windColor(200), '#6b2a7a');
assert.ok(windLength(0) < windLength(30) && windLength(500) === 56);
assert.ok(snowRadius(0) === 5 && snowRadius(400) === 32 && snowRadius(-3) === 5);
console.log('✓ scale ok');
