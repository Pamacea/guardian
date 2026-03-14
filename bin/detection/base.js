/**
 * Base Detection Module (Legacy)
 *
 * Handles detection for traditional frameworks and languages
 * that were supported in Guardian v0.5.x
 */

const fs = require('fs');
const path = require('path');

// Framework markers from original config.js
const PROJECT_MARKERS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
  'go.mod', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json', 'Cargo.toml'
];

/**
 * Legacy framework detection
 * @param {string} projectPath - Path to the project
 * @returns {Promise<Object>} Detection result
 */
async function detectLegacy(projectPath) {
  const result = {
    frameworks: [],
    languages: [],
    details: {}
  };

  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    result.languages.push('javascript');

    // Detect Node.js frameworks
    if (pkg.dependencies) {
      if (pkg.dependencies.express) result.frameworks.push('express');
      if (pkg.dependencies.fastify) result.frameworks.push('fastify');
      if (pkg.dependencies.hono) result.frameworks.push('hono');
      if (pkg.dependencies.koa) result.frameworks.push('koa');
      if (pkg.dependencies['next']) result.frameworks.push('nextjs');
      if (pkg.dependencies.nuxt) result.frameworks.push('nuxt');
      if (pkg.dependencies['@sveltejs/kit']) result.frameworks.push('sveltekit');
      if (pkg.dependencies['@remix-run/react']) result.frameworks.push('remix');
    }
  }

  const requirementsPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    result.languages.push('python');
    const requirements = fs.readFileSync(requirementsPath, 'utf8');
    if (requirements.includes('django')) result.frameworks.push('django');
    if (requirements.includes('flask')) result.frameworks.push('flask');
    if (requirements.includes('fastapi')) result.frameworks.push('fastapi');
  }

  const goModPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goModPath)) {
    result.languages.push('go');
    const goMod = fs.readFileSync(goModPath, 'utf8');
    if (goMod.includes('gin')) result.frameworks.push('gin');
    if (goMod.includes('echo')) result.frameworks.push('echo');
    if (goMod.includes('fiber')) result.frameworks.push('fiber');
  }

  const pomPath = path.join(projectPath, 'pom.xml');
  if (fs.existsSync(pomPath)) {
    result.languages.push('java');
    result.frameworks.push('spring-boot');
  }

  const gemfilePath = path.join(projectPath, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    result.languages.push('ruby');
    result.frameworks.push('rails');
  }

  const composerPath = path.join(projectPath, 'composer.json');
  if (fs.existsSync(composerPath)) {
    result.languages.push('php');
    result.frameworks.push('laravel');
  }

  return result;
}

module.exports = {
  detectLegacy,
  PROJECT_MARKERS
};
