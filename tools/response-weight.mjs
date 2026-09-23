// Independent body-size audit when Chromium cannot retain fetched bitmap bodies
// for the official gate's response.buffer() calls. Never change the gate result.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const reportPath=process.argv[2]||'_artifacts/performance/final/report.json';
const report=JSON.parse(await fs.readFile(reportPath,'utf8')),files=[];
async function visit(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else files.push(file);}}
await visit('game');
const responses=[];
for(const name of ['index.html',...report.boot.resources.map(r=>r.name)]){
 const matches=files.filter(file=>path.basename(file)===name);assert.equal(matches.length,1,`Resolve exactly one local resource: ${name}`);responses.push({file:matches[0],bytes:(await fs.stat(matches[0])).size});
}
const bytes=responses.reduce((sum,r)=>sum+r.bytes,0),audit={scope:'Current local file-body sizes for every observed runtime resource, including the document; not wire compression',responses,bytes,MB:bytes/1e6};
assert(bytes<10e6);await fs.writeFile(path.join(path.dirname(reportPath),'response-weight.json'),JSON.stringify(audit,null,2));console.log(`${responses.length} observed responses: ${bytes} uncompressed bytes (${audit.MB.toFixed(2)} MB) — under 10 MB`);
