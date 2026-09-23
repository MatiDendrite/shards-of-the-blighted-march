// Mechanical copy of the pinned library's official minified distribution.
// Keep the same import path, public exports, version and upstream license.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const pkg=JSON.parse(await fs.readFile('node_modules/three/package.json','utf8'));
assert.equal(pkg.version,'0.169.0');
const source='node_modules/three/build/three.module.min.js',target='game/vendor/three.module.js';
const bytes=await fs.readFile(source);assert(bytes.toString().includes('@license'));
await fs.copyFile(source,target);console.log(`Three ${pkg.version}: official minified module, ${bytes.length} bytes (license retained)`);
