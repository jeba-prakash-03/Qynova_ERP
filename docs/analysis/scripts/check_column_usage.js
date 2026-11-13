const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const backendSrc = path.join(rootDir, 'backend/src');
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../schema_dump.json')));

function listFiles(dir, exts = ['.ts', '.tsx', '.js']) {
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

const files = listFiles(backendSrc);

const tableColumns = {};
for (const [table, data] of Object.entries(schema)) {
  tableColumns[table] = new Set(data.columns.map(c => c.COLUMN_NAME));
}

// Check repository files specifically where queries are formed
const issues = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(rootDir, file);

  // Look for knex('table').insert({ col: ... }) or knex('table').update({ col: ... })
  // Regex to find table queries
  for (const [table, cols] of Object.entries(tableColumns)) {
    const tableRegex = new RegExp(`(?:db|knex|tx)\\(['"\`]${table}['"\`]\\)[\\s\\S]*?\\.(insert|update)\\(([\\s\\S]*?)\\)`, 'g');
    let m;
    while ((m = tableRegex.exec(content)) !== null) {
      const op = m[1];
      const arg = m[2];
      
      // Match object keys in arg: { key1: ..., key2: ... }
      const keyRegex = /([a-zA-Z0-9_]+)\s*:/g;
      let km;
      while ((km = keyRegex.exec(arg)) !== null) {
        const key = km[1];
        if (!cols.has(key) && !['first', 'then', 'catch', 'finally', 'where', 'andWhere'].includes(key)) {
          // If key is not in cols and not a js keyword/method
          // check if it might be a valid column
          issues.push({
            file: rel,
            table,
            operation: op,
            invalidColumn: key
          });
        }
      }
    }
  }
});

fs.writeFileSync(path.resolve(__dirname, '../column_issues.json'), JSON.stringify(issues, null, 2));
console.log('Checked column usage. Found potential issues:', issues.length);
