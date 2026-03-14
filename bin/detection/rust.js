/**
 * Rust Detection Module
 */

const fs = require('fs');
const path = require('path');

const RUST_MARKERS = ['Cargo.toml'];
const RUST_FRAMEWORKS = {
  'actix-web': 'actix-web',
  'axum': 'axum',
  'rocket': 'rocket',
  'warp': 'warp'
};

async function detectRust(projectPath, fsModule = fs) {
  const result = { detected: false, language: 'rust', edition: null, framework: null, runtime: null };

  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (fsModule.existsSync(cargoPath)) {
    result.detected = true;
    const content = fsModule.readFileSync(cargoPath, 'utf8');

    const editionMatch = content.match(/edition\s*=\s*"(\d+)"/);
    if (editionMatch) result.edition = editionMatch[1];

    for (const [name, dep] of Object.entries(RUST_FRAMEWORKS)) {
      if (content.includes(dep)) {
        result.framework = name;
        break;
      }
    }

    if (content.includes('tokio')) result.runtime = 'tokio';
  }

  return result;
}

module.exports = { detectRust, RUST_MARKERS };
