// Runs `node --check` on every .js file in src/ and test/.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
const files = ['src', 'test'].filter(fs.existsSync).flatMap(walk);
for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log(`OK: ${files.length} files passed node --check`);
