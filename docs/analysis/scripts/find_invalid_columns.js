const fs = require('fs');
const path = require('path');
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../schema_dump.json')));

const allValidColumns = new Set();
for (const [table, data] of Object.entries(schema)) {
  for (const col of data.columns) {
    allValidColumns.add(col.COLUMN_NAME);
  }
}

// Add common aliases or virtual expressions
allValidColumns.add('*');
allValidColumns.add('count');
allValidColumns.add('total');

function listFiles(dir, exts = ['.ts']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== '.git') {
        files = files.concat(listFiles(full, exts));
      }
    } else if (exts.some(ext => item.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const files = listFiles(path.resolve(__dirname, '../../../backend/src/modules'));
const suspicious = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(path.resolve(__dirname, '../../../'), file);

  // Match where({ colName: ... }) or andWhere({ colName: ... })
  const whereObjectRegex = /(?:where|andWhere)\(\{([^}]+)\}\)/g;
  let m;
  while ((m = whereObjectRegex.exec(content)) !== null) {
    const objContent = m[1];
    const keyMatches = objContent.match(/([a-zA-Z0-9_]+)\s*:/g) || [];
    keyMatches.forEach(k => {
      const col = k.replace(':', '').trim();
      if (!allValidColumns.has(col) && !col.includes('this') && !col.startsWith('is') && col !== 'raw') {
        suspicious.push({ file: rel, type: 'whereObject', column: col });
      }
    });
  }

  // Match .where('colName', ...)
  const whereColRegex = /(?:where|andWhere|orWhere|whereNull|whereNotNull)\(['"`]([a-zA-Z0-9_]+)['"`]/g;
  let wm;
  while ((wm = whereColRegex.exec(content)) !== null) {
    const col = wm[1];
    if (!allValidColumns.has(col) && !col.includes('.')) {
      suspicious.push({ file: rel, type: 'whereCol', column: col });
    }
  }
});

console.log('Suspicious non-existent columns found in Knex where clauses:');
console.log(JSON.stringify(suspicious, null, 2));
