/**
 * Detection Orchestrator
 */

const fs = require('fs');
const { detectNestJS } = require('./nestjs');
const { detectRust } = require('./rust');
const { detectVite } = require('./vite');

/**
 * Detect project frameworks and languages
 * @param {string} projectPath - Path to the project
 * @param {Object} fsModule - File system module (for testing)
 * @returns {Object} Detection results
 */
async function detectProject(projectPath, fsModule = fs) {
  const results = {
    frameworks: [],
    languages: [],
    timestamp: new Date().toISOString()
  };

  // Detect NestJS
  const nestjs = await detectNestJS(projectPath, fsModule);
  if (nestjs.detected) {
    results.frameworks.push({ name: 'nestjs', version: nestjs.version, features: nestjs.features });
  }

  // Detect Rust
  const rust = await detectRust(projectPath, fsModule);
  if (rust.detected) {
    results.languages.push({ name: 'rust', edition: rust.edition, framework: rust.framework });
  }

  // Detect Vite
  const vite = await detectVite(projectPath, fsModule);
  if (vite.detected) {
    results.frameworks.push({ name: 'vite', version: vite.version });
  }

  return results;
}

module.exports = { detectProject, detectNestJS, detectRust, detectVite };
