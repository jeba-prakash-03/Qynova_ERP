const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const backendSrc = path.join(rootDir, 'backend/src');
const frontendSrc = path.join(rootDir, 'frontend/src');

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

// 1. Backend Route Inspection
const routeFiles = listFiles(backendSrc).filter(f => f.endsWith('.routes.ts'));
const backendRoutes = [];

routeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(backendSrc, file);

  // Match router.get, router.post, router.put, router.patch, router.delete
  // e.g. router.get('/path', authMiddleware, requirePermission('perm'), controller.method)
  const regex = /router\.(get|post|put|patch|delete)\(\s*(['"`][^'"`]+['"`])([\s\S]*?)(?=\n\s*(?:router|\/\*|\/\/|export|const|\}\)|\)$|$))/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2].replace(/['"`]/g, '');
    const rest = match[3];

    // Extract authenticate
    const hasAuth = rest.includes('authenticate') || rest.includes('authMiddleware');
    
    // Extract requirePermission
    const permMatch = rest.match(/requirePermission\(([^)]+)\)/);
    const permission = permMatch ? permMatch[1].replace(/['"`]/g, '').trim() : (rest.includes('authenticate') ? 'Authenticated only' : 'Public');
    
    // Extract requireEmployee
    const hasRequireEmployee = rest.includes('requireEmployee');

    // Extract middlewares
    const middlewares = [];
    if (hasAuth) middlewares.push('authenticate');
    if (permMatch) middlewares.push(`requirePermission(${permission})`);
    if (hasRequireEmployee) middlewares.push('requireEmployee');
    if (rest.includes('upload.')) middlewares.push('multer-upload');
    if (rest.includes('validate(')) {
      const valMatch = rest.match(/validate\(([^)]+)\)/);
      middlewares.push(`validate(${valMatch ? valMatch[1] : ''})`);
    }

    // Extract controller/handler name
    const handlerMatch = rest.match(/([a-zA-Z0-9_]+Controller\.[a-zA-Z0-9_]+|[a-zA-Z0-9_]+Service\.[a-zA-Z0-9_]+|\(req,\s*res[\s\S]*?\)\s*=>)/);
    const handler = handlerMatch ? handlerMatch[1] : 'inline';

    backendRoutes.push({
      file: relPath,
      method,
      path: routePath,
      permission,
      middlewares: middlewares.join(', ') || 'none',
      handler
    });
  }
});

// 2. Service Functions
const serviceFiles = listFiles(backendSrc).filter(f => f.endsWith('.service.ts'));
const serviceFunctions = {};

serviceFiles.forEach(file => {
  const relPath = path.relative(backendSrc, file);
  const content = fs.readFileSync(file, 'utf8');
  const methods = [];
  
  // match async methodName( or methodName = async (
  const methodRegex = /(?:async\s+([a-zA-Z0-9_]+)\s*\(|([a-zA-Z0-9_]+)\s*=\s*async\s*\()/g;
  let m;
  while ((m = methodRegex.exec(content)) !== null) {
    methods.push(m[1] || m[2]);
  }
  serviceFunctions[relPath] = methods;
});

// 3. Database Schema & Tables
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../schema_dump.json')));
const tables = Object.keys(schema);

const backendAllFiles = listFiles(backendSrc);
const tableUsage = {};
tables.forEach(t => tableUsage[t] = []);

backendAllFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  tables.forEach(t => {
    const regex = new RegExp(`['"\`]${t}['"\`]`, 'g');
    if (regex.test(content)) {
      tableUsage[t].push(path.relative(backendSrc, file));
    }
  });
});

const unusedTables = tables.filter(t => tableUsage[t].length === 0);

// Check column usage for non-existent columns
const columnErrors = [];
backendAllFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(backendSrc, file);
  
  // Look for .select('col') or where('col') or .insert({ col: ... })
  // We check specific known table contexts or patterns
});

// 4. Frontend App.tsx & menuConfig.ts
const menuConfigContent = fs.readFileSync(path.join(frontendSrc, 'shared/navigation/menuConfig.ts'), 'utf8');
const appTsxContent = fs.readFileSync(path.join(frontendSrc, 'App.tsx'), 'utf8');

// Parse menuConfig items
const menuItems = [];
const menuItemRegex = /label:\s*['"]([^'"]+)['"][\s\S]*?path:\s*['"]([^'"]+)['"](?:[\s\S]*?permission:\s*['"]([^'"]+)['"])?(?:[\s\S]*?requireEmployee:\s*(true|false))?/g;
let mi;
while ((mi = menuItemRegex.exec(menuConfigContent)) !== null) {
  menuItems.push({
    label: mi[1],
    path: mi[2],
    permission: mi[3] || 'None',
    requireEmployee: mi[4] === 'true'
  });
}

// Parse App.tsx Routes
const frontendRoutes = [];
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{([\s\S]*?)\}/g;
let fr;
while ((fr = routeRegex.exec(appTsxContent)) !== null) {
  const routePath = fr[1];
  const elementStr = fr[2];
  
  const permMatch = elementStr.match(/permission=["']([^"']+)["']/);
  const reqEmpMatch = elementStr.match(/requireEmployee(?:=\{true\})?/);
  const compMatch = elementStr.match(/<([A-Z][a-zA-Z0-9]+)/);

  frontendRoutes.push({
    path: routePath,
    component: compMatch ? compMatch[1] : 'Unknown',
    permission: permMatch ? permMatch[1] : 'Public / Authenticated',
    requireEmployee: Boolean(reqEmpMatch)
  });
}

// Routes with no menu item & menu items with no route
const menuPaths = new Set(menuItems.map(m => m.path));
const routePaths = new Set(frontendRoutes.map(r => r.path));

const routesWithNoMenu = frontendRoutes.filter(r => !menuPaths.has(r.path));
const menuWithNoRoute = menuItems.filter(m => !routePaths.has(m.path));

// 5. Frontend API calls per page
const pageFiles = listFiles(path.join(frontendSrc, 'features'), ['.tsx']).filter(f => f.includes('Page') || f.includes('Tab') || f.includes('Modal'));
const pageApiCalls = {};

pageFiles.forEach(file => {
  const relPath = path.relative(frontendSrc, file);
  const content = fs.readFileSync(file, 'utf8');
  
  // Match axiosClient.get/post/put/patch/delete or api method calls
  const apiCalls = new Set();
  const axiosMatches = content.match(/axiosClient\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g) || [];
  axiosMatches.forEach(m => apiCalls.add(m));
  
  // Also match custom api calls like crmApi.xxx, payrollApi.xxx
  const customApiMatches = content.match(/([a-zA-Z0-9_]+Api\.[a-zA-Z0-9_]+)/g) || [];
  customApiMatches.forEach(m => apiCalls.add(m));

  if (apiCalls.size > 0) {
    pageApiCalls[relPath] = Array.from(apiCalls);
  }
});

// Output summary
const output = {
  backendRoutesCount: backendRoutes.length,
  backendRoutes,
  serviceFunctions,
  tablesCount: tables.length,
  unusedTables,
  menuItems,
  frontendRoutes,
  routesWithNoMenu,
  menuWithNoRoute,
  pageApiCalls
};

fs.writeFileSync(path.resolve(__dirname, '../inventory_raw.json'), JSON.stringify(output, null, 2));
console.log('Inventory raw data generated:');
console.log('- Backend routes:', backendRoutes.length);
console.log('- Unused tables:', unusedTables);
console.log('- Menu items:', menuItems.length);
console.log('- Frontend routes:', frontendRoutes.length);
console.log('- Routes with no menu:', routesWithNoMenu.length);
console.log('- Menu items with no route:', menuWithNoRoute.length);
