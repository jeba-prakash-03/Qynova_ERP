const fs = require('fs');
const path = require('path');

// Helper to recursively list files
function listFiles(dir, exts = ['.ts', '.tsx', '.js']) {
  let files = [];
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

// 1. Scan backend routes
const backendSrc = path.resolve(__dirname, '../../../backend/src');
const routeFiles = listFiles(backendSrc).filter(f => f.includes('.routes.ts'));

console.log(`Found ${routeFiles.length} route files in backend.`);

const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../schema_dump.json')));
const tables = Object.keys(schema);

// Check table references in backend/src
const backendFiles = listFiles(backendSrc);
const tableUsage = {};
tables.forEach(t => tableUsage[t] = []);

backendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  tables.forEach(t => {
    // Check for db('table') or knex('table') or 'table'
    const regex = new RegExp(`['"\`]${t}['"\`]`, 'g');
    if (regex.test(content)) {
      tableUsage[t].push(path.relative(backendSrc, file));
    }
  });
});

const unusedTables = tables.filter(t => tableUsage[t].length === 0);
console.log('Unused tables:', unusedTables);

fs.writeFileSync(path.resolve(__dirname, '../table_usage.json'), JSON.stringify({ tableUsage, unusedTables }, null, 2));

// 2. Scan frontend menuConfig and App.tsx
const menuConfigPath = path.resolve(__dirname, '../../frontend/src/shared/navigation/menuConfig.ts');
const appTsxPath = path.resolve(__dirname, '../../frontend/src/App.tsx');

console.log('Backend files scanned successfully.');
