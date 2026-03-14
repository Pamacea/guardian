/**
 * NestJS Detection Module
 */

const fs = require('fs');
const path = require('path');

const NESTJS_MARKERS = ['nest-cli.json', '.nest-cli.json'];
const NESTJS_DEPENDENCIES = ['@nestjs/core', '@nestjs/common'];

async function detectNestJS(projectPath, fsModule = fs) {
  const result = { detected: false, framework: 'nestjs', version: null, features: [] };

  for (const marker of NESTJS_MARKERS) {
    if (fsModule.existsSync(path.join(projectPath, marker))) {
      result.detected = true;
      break;
    }
  }

  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (fsModule.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fsModule.readFileSync(pkgJsonPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const dep of NESTJS_DEPENDENCIES) {
      if (deps[dep]) {
        result.detected = true;
        if (dep === '@nestjs/core') result.version = deps[dep];
      }
    }

    if (deps['@nestjs/graphql']) result.features.push('graphql');
    if (deps['@nestjs/throttler']) result.features.push('throttler');
  }

  return result;
}

module.exports = { detectNestJS, NESTJS_MARKERS };
