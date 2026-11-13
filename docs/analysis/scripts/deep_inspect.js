const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const backendSrc = path.join(rootDir, 'backend/src');

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

// 1. Check raw SQL injection
const rawMatches = [];
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if ((line.includes('.raw(') || line.includes('whereRaw(')) && line.includes('${')) {
      rawMatches.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim()
      });
    }
  });
});

// 2. Check payroll hardcoded divisors
const payrollDivisors = [];
const payrollFiles = files.filter(f => f.includes('payroll') || f.includes('salary'));
payrollFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/\/\s*(?:30|31|26|365)\b/.test(line)) {
      payrollDivisors.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim()
      });
    }
  });
});

// 3. Check for users.id used as employee_id or vice versa
const idMismatches = [];
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for user_id passed where employee_id is expected or req.user.id used in employee_id column
    if ((line.includes('employee_id: req.user.id') || line.includes('employee_id: user.id') || line.includes('employee_id = req.user.id') || line.includes('employeeId = req.user.id')) && !line.includes('req.user.employeeId')) {
      idMismatches.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim()
      });
    }
  });
});

// 4. Check routes without authenticate or requirePermission
const routeFiles = files.filter(f => f.endsWith('.routes.ts'));
const unprotectedRoutes = [];
routeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(rootDir, file);
  
  // match router.xxx
  const regex = /router\.(get|post|put|patch|delete)\(\s*(['"`][^'"`]+['"`])([\s\S]*?)(?=\n\s*(?:router|\/\*|\/\/|export|const|\}\)|\)$|$))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const body = match[3];
    
    const hasAuth = body.includes('authenticate') || body.includes('authMiddleware');
    const hasPerm = body.includes('requirePermission');
    
    // Whitelist public routes in auth.routes.ts, health, public branding
    if (!rel.includes('auth.routes') && !rel.includes('public') && (!hasAuth || !hasPerm)) {
      unprotectedRoutes.push({
        file: rel,
        method,
        path: routePath,
        hasAuth,
        hasPerm
      });
    }
  }
});

// 5. Check mass assignment (e.g. knex.insert(req.body) or update(req.body))
const massAssignments = [];
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/\.(?:insert|update)\(\s*req\.body\s*\)/.test(line)) {
      massAssignments.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        code: line.trim()
      });
    }
  });
});

const report = {
  rawMatches,
  payrollDivisors,
  idMismatches,
  unprotectedRoutes,
  massAssignments
};

fs.writeFileSync(path.resolve(__dirname, '../deep_inspect_results.json'), JSON.stringify(report, null, 2));
console.log('Deep inspect completed:');
console.log('- SQL injection risks (raw with template literal):', rawMatches.length);
console.log('- Payroll hardcoded divisors:', payrollDivisors.length);
console.log('- ID Mismatches (user.id as employee_id):', idMismatches.length);
console.log('- Unprotected routes (missing auth or perm):', unprotectedRoutes.length);
console.log('- Mass assignments:', massAssignments.length);
