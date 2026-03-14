/**
 * Vite Detection Module
 */

const fs = require('fs');
const path = require('path');

const VITE_MARKERS = ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'];
const VITE_PLUGINS = ['@vitejs/plugin-react', '@vitejs/plugin-vue', '@vitejs/plugin-svelte'];
const VOIDZERO_TOOLS = ['nv', 'vti', 'robo', 'nm'];

async function detectVite(projectPath, fsModule = fs) {
  const result = {
    detected: false,
    framework: 'vite',
    version: null,
    plugins: [],
    voidzero: {
      detected: false,
      tools: [],
      packageManager: null
    }
  };

  for (const marker of VITE_MARKERS) {
    if (fsModule.existsSync(path.join(projectPath, marker))) {
      result.detected = true;
      break;
    }
  }

  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (fsModule.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fsModule.readFileSync(pkgJsonPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['vite']) {
      result.detected = true;
      result.version = deps['vite'];
    }

    for (const plugin of VITE_PLUGINS) {
      if (deps[plugin]) result.plugins.push(plugin);
    }

    // Detect VoidZero tools
    for (const tool of VOIDZERO_TOOLS) {
      if (deps[tool]) {
        result.voidzero.detected = true;
        result.voidzero.tools.push(tool);
      }
    }

    // Detect package manager
    if (fsModule.existsSync(path.join(projectPath, 'package-lock.json'))) {
      result.voidzero.packageManager = 'npm';
    } else if (fsModule.existsSync(path.join(projectPath, 'yarn.lock'))) {
      result.voidzero.packageManager = 'yarn';
    } else if (fsModule.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      result.voidzero.packageManager = 'pnpm';
    } else if (fsModule.existsSync(path.join(projectPath, 'bun.lockb'))) {
      result.voidzero.packageManager = 'bun';
    }
  }

  return result;
}

module.exports = { detectVite, VITE_MARKERS, VOIDZERO_TOOLS };
