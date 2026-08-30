const fs = require('fs');
const html = fs.readFileSync('docs/index.html', 'utf8');
const data = JSON.parse(
  html.match(/<script id="docs-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
);

function grab(name) {
  const re = new RegExp('\\n    function ' + name + '\\s*\\(');
  const i = html.search(re);
  if (i < 0) throw new Error('not found ' + name);
  const start = html.indexOf('function ' + name, i);
  let depth = 0;
  let j = html.indexOf('{', start);
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}') {
      depth--;
      if (depth === 0) return html.slice(start, k + 1);
    }
  }
  throw new Error('no close ' + name);
}

const src = ['esc', 'slug', 'highlight', 'codeBlock', 'inline', 'splitRow', 'markdown']
  .map(grab)
  .join('\n');
eval(src);

let tables = 0;
let blocks = 0;
for (const g of data.guide) {
  const out = markdown(g.body.replace(/^\s*#[^\n]*\n+/, ''));
  tables += (out.match(/md-table/g) || []).length;
  blocks += (out.match(/codeblock/g) || []).length;
  if (out.includes('undefined')) throw new Error('literal undefined in ' + g.id);
}
console.log('guide bodies OK | tables:', tables, '| codeblocks:', blocks);

let ex = 0;
for (const s of data.reference) {
  for (const e of s.entries) {
    if (e.signature) highlight(e.signature);
    if (e.example) {
      highlight(e.example);
      ex++;
    }
    if (e.summary) markdown(e.summary);
    if (e.notes) markdown(e.notes);
  }
}
console.log('highlighted', ex, 'examples + all signatures + summaries OK');

const co = markdown(data.guide.find((g) => g.id === 'client-options').body);
console.log(
  'client-options table -> headers:',
  (co.match(/<th>/g) || []).length,
  '| cells:',
  (co.match(/<td>/g) || []).length,
);
const eh = markdown(data.guide.find((g) => g.id === 'error-handling').body);
console.log('error-handling table -> cells:', (eh.match(/<td>/g) || []).length);
