/**
 * Vite/VoidZero Security Scanner
 *
 * Performs security checks specific to Vite projects
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Scan Vite project for vulnerabilities
 * @param {Object} viteInfo - Vite detection info
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
async function scan(viteInfo, options = {}) {
  const results = {
    framework: 'vite',
    version: viteInfo.version,
    checks: [],
    vulnerabilities: [],
    features: viteInfo.features || [],
    voidzero: viteInfo.voidzero || {}
  };

  const projectPath = options.projectPath || process.cwd();
  const target = options.target || 'http://localhost:5173';
  const containerName = options.containerName || 'guardian-tools';

  // Run Vite-specific checks
  const checks = [
    checkSourceMapLeak(projectPath),
    checkHMRInjection(target, containerName),
    checkDependencyPrebundling(projectPath),
    checkDevServerCORS(target, containerName),
    checkPublicFilesExposure(projectPath),
    checkEnvVarLeak(projectPath)
  ];

  if (viteInfo.voidzero?.detected) {
    checks.push(checkVoidZeroTools(projectPath));
  }

  const checkResults = await Promise.allSettled(checks);

  for (const checkResult of checkResults) {
    if (checkResult.status === 'fulfilled' && checkResult.value) {
      results.checks.push(checkResult.value);
      if (checkResult.value.vulnerabilities) {
        results.vulnerabilities.push(...checkResult.value.vulnerabilities);
      }
    }
  }

  return results;
}

/**
 * Check for source map leaks
 */
async function checkSourceMapLeak(projectPath) {
  const result = {
    name: 'Source Map Leak Check',
    status: 'passed',
    vulnerabilities: [],
    leakedFiles: []
  };

  const distPath = path.join(projectPath, 'dist');
  const buildPath = path.join(projectPath, 'build');

  const checkDir = (dir) => {
    if (!fs.existsSync(dir)) return;

    const files = getAllFiles(dir);
    for (const file of files) {
      if (file.endsWith('.map')) {
        result.leakedFiles.push(file);
      }
    }
  };

  checkDir(distPath);
  checkDir(buildPath);

  if (result.leakedFiles.length > 0) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Source Maps Exposed',
      description: `Found ${result.leakedFiles.length} source map files in production build`,
      files: result.leakedFiles,
      recommendation: 'Disable sourcemaps in production: build.sourcemap = false'
    });
    result.status = 'failed';
  }

  return result;
}

/**
 * Check for HMR injection vulnerabilities
 */
async function checkHMRInjection(target, containerName) {
  const result = {
    name: 'HMR Injection Check',
    status: 'passed',
    vulnerabilities: []
  };

  try {
    // Test if HMR endpoint is accessible
    const output = await runInContainer(containerName, [
      'httpie', '--ignore-stdin', 'GET',
      `${target}/@vite/client`
    ], { timeout: 5000 });

    if (output && (output.includes('connect') || output.includes('socket'))) {
      result.vulnerabilities.push({
        severity: 'LOW',
        title: 'HMR Endpoint Exposed',
        description: 'Vite HMR client endpoint accessible',
        endpoint: `${target}/@vite/client`,
        recommendation: 'Ensure HMR is disabled in production or behind auth'
      });
      result.status = 'warning';
    }
  } catch {
    // HMR endpoint not accessible (expected in production)
  }

  // Test for WebSocket HMR connection
  try {
    const wsUrl = target.replace('http', 'ws') + '/__vite_hmr';
    const output = await runInContainer(containerName, [
      'curl', '-s', '-i', '-N',
      '-H', 'Connection: Upgrade',
      '-H', 'Upgrade: websocket',
      '-H', 'Sec-WebSocket-Version: 13',
      wsUrl
    ], { timeout: 3000 });

    if (output && output.includes('101')) {
      result.vulnerabilities.push({
        severity: 'LOW',
        title: 'HMR WebSocket Exposed',
        description: 'Vite HMR WebSocket accessible',
        endpoint: wsUrl,
        recommendation: 'Ensure HMR WebSocket is not exposed in production'
      });
      result.status = 'warning';
    }
  } catch {
    // WebSocket not accessible
  }

  return result;
}

/**
 * Check dependency pre-bundling security
 */
async function checkDependencyPrebundling(projectPath) {
  const result = {
    name: 'Dependency Pre-bundling Check',
    status: 'passed',
    vulnerabilities: [],
    issues: []
  };

  const nodeModulesPath = path.join(projectPath, 'node_modules', '.vite');
  if (!fs.existsSync(nodeModulesPath)) {
    result.status = 'skipped';
    result.note = 'No pre-bundled dependencies found';
    return result;
  }

  // Check for vulnerable pre-bundled dependencies
  const pkgLockPath = path.join(projectPath, 'package-lock.json');
  if (fs.existsSync(pkgLockPath)) {
    const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));

    // Check for known vulnerable packages in dependencies
    const vulnerablePackages = [
      { name: 'lodash', versions: ['<4.17.21'] },
      { name: 'axios', versions: ['<0.21.1'] },
      { name: 'minimist', versions: ['<1.2.6'] }
    ];

    for (const pkg of vulnerablePackages) {
      if (pkgLock.packages && pkgLock.packages[`node_modules/${pkg.name}`]) {
        const version = pkgLock.packages[`node_modules/${pkg.name}`].version;
        result.issues.push({ package: pkg.name, version });
      }
    }
  }

  if (result.issues.length > 0) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Vulnerable Pre-bundled Dependencies',
      description: `Found ${result.issues.length} potentially vulnerable packages`,
      issues: result.issues,
      recommendation: 'Update dependencies and run npm audit'
    });
    result.status = 'failed';
  }

  return result;
}

/**
 * Check dev server CORS configuration
 */
async function checkDevServerCORS(target, containerName) {
  const result = {
    name: 'Dev Server CORS Check',
    status: 'passed',
    vulnerabilities: []
  };

  try {
    const output = await runInContainer(containerName, [
      'httpie', '--ignore-stdin', 'GET', target,
      'Origin:evil.com'
    ], { timeout: 5000 });

    if (output && output.includes('access-control-allow-origin: *')) {
      result.vulnerabilities.push({
        severity: 'LOW',
        title: 'Dev Server CORS Permissive',
        description: 'Dev server allows requests from any origin',
        recommendation: 'This is acceptable for dev only, ensure production config is secure'
      });
      result.status = 'warning';
    }
  } catch {
    // Server not running or request blocked
  }

  return result;
}

/**
 * Check for public file exposure
 */
async function checkPublicFilesExposure(projectPath) {
  const result = {
    name: 'Public Files Exposure Check',
    status: 'passed',
    vulnerabilities: [],
    exposedFiles: []
  };

  const publicPath = path.join(projectPath, 'public');
  if (!fs.existsSync(publicPath)) {
    result.status = 'skipped';
    result.note = 'No public directory found';
    return result;
  }

  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'config.json',
    'secrets.json',
    '.git',
    'README.md',
    'CHANGELOG.md'
  ];

  const files = getAllFiles(publicPath);
  for (const file of files) {
    const fileName = path.basename(file);
    if (sensitiveFiles.includes(fileName) || fileName.includes('secret')) {
      result.exposedFiles.push(file);
    }
  }

  if (result.exposedFiles.length > 0) {
    result.vulnerabilities.push({
      severity: 'HIGH',
      title: 'Sensitive Files in Public Directory',
      description: 'Sensitive files found in public directory',
      files: result.exposedFiles,
      recommendation: 'Remove sensitive files from public directory'
    });
    result.status = 'failed';
  }

  return result;
}

/**
 * Check for environment variable leaks
 */
async function checkEnvVarLeak(projectPath) {
  const result = {
    name: 'Environment Variable Leak Check',
    status: 'passed',
    vulnerabilities: [],
    leakedVars: []
  };

  const checkDir = (dir) => {
    if (!fs.existsSync(dir)) return;

    const files = getAllFiles(dir).filter(f =>
      f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx')
    );

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for import.meta.env usage
      const envMatches = content.matchAll(/import\.meta\.env\.(\w+)/g);
      for (const match of envMatches) {
        const envVar = match[1];
        if (envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASSWORD')) {
          result.leakedVars.push({ file, var: envVar });
        }
      }

      // Check for process.env usage
      const procEnvMatches = content.matchAll(/process\.env\.(\w+)/g);
      for (const match of procEnvMatches) {
        const envVar = match[1];
        if (envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('PASSWORD')) {
          result.leakedVars.push({ file, var: envVar });
        }
      }
    }
  };

  checkDir(path.join(projectPath, 'src'));
  checkDir(path.join(projectPath, 'public'));

  if (result.leakedVars.length > 0) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Potentially Leaked Environment Variables',
      description: `Found ${result.leakedVars.length} uses of sensitive environment variables`,
      leaks: result.leakedVars,
      recommendation: 'Ensure sensitive env vars are not exposed to client-side code'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Check VoidZero tools security
 */
async function checkVoidZeroTools(projectPath) {
  const result = {
    name: 'VoidZero Tools Security Check',
    status: 'passed',
    vulnerabilities: [],
    tools: []
  };

  // Check package.json for VoidZero tools
  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    const voidzeroTools = ['nv', 'vti', 'robo', 'nm'];
    for (const tool of voidzeroTools) {
      if (pkg.devDependencies?.[tool] || pkg.dependencies?.[tool]) {
        result.tools.push(tool);
      }
    }
  }

  // Check for lockfile integrity
  const lockfiles = [
    { name: 'package-lock.json', manager: 'npm' },
    { name: 'yarn.lock', manager: 'yarn' },
    { name: 'pnpm-lock.yaml', manager: 'pnpm' },
    { name: 'bun.lockb', manager: 'bun' }
  ];

  let lockfileCount = 0;
  for (const lockfile of lockfiles) {
    if (fs.existsSync(path.join(projectPath, lockfile.name))) {
      lockfileCount++;
    }
  }

  if (lockfileCount > 1) {
    result.vulnerabilities.push({
      severity: 'LOW',
      title: 'Multiple Lockfiles Detected',
      description: `Found ${lockfileCount} different lockfiles`,
      recommendation: 'Use a single package manager to avoid conflicts'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Run command inside container
 */
async function runInContainer(containerName, args, options = {}) {
  return new Promise((resolve, reject) => {
    const [command, ...cmdArgs] = ['docker', 'exec', containerName, ...args];
    const child = spawn(command, cmdArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out'));
    }, options.timeout || 10000);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed: ${stderr}`));
      }
    });
  });
}

module.exports = {
  scan,
  checkSourceMapLeak,
  checkHMRInjection,
  checkDependencyPrebundling,
  checkDevServerCORS,
  checkPublicFilesExposure,
  checkEnvVarLeak,
  checkVoidZeroTools
};
