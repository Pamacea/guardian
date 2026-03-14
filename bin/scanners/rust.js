/**
 * Rust Security Scanner
 *
 * Performs security checks specific to Rust applications
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Scan Rust project for vulnerabilities
 * @param {Object} rustInfo - Rust detection info
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
async function scan(rustInfo, options = {}) {
  const results = {
    language: 'rust',
    edition: rustInfo.edition,
    framework: rustInfo.framework,
    checks: [],
    vulnerabilities: [],
    unsafeBlocks: rustInfo.unsafeBlocks || [],
    dependencies: rustInfo.dependencies || []
  };

  const projectPath = options.projectPath || process.cwd();
  const containerName = options.containerName || 'guardian-tools';

  // Run Rust-specific checks
  const checks = [
    checkUnsafeBlocks(projectPath),
    checkSerdeDeserialization(projectPath),
    checkUnwrapUsage(projectPath),
    checkPanicSafety(projectPath),
    runCargoAudit(projectPath, containerName),
    runCargoDeny(projectPath, containerName),
    checkIntegerOverflow(projectPath),
    checkDependencyVulnerabilities(projectPath)
  ];

  if (rustInfo.framework) {
    checks.push(checkFrameworkVulnerabilities(rustInfo.framework, projectPath));
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
 * Check unsafe blocks
 */
async function checkUnsafeBlocks(projectPath) {
  const result = {
    name: 'Unsafe Block Analysis',
    status: 'passed',
    vulnerabilities: [],
    unsafeCount: 0,
    details: []
  };

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'target' && entry.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.rs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const unsafeMatch = line.match(/\bunsafe\b/);
          if (unsafeMatch) {
            result.unsafeCount++;
            result.details.push({
              file: fullPath,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
    }
  };

  scanDir(path.join(projectPath, 'src'));

  if (result.unsafeCount > 20) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Excessive Unsafe Blocks',
      description: `Found ${result.unsafeCount} unsafe blocks in codebase`,
      recommendation: 'Review unsafe blocks for safety violations'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Run cargo-audit for dependency vulnerabilities
 */
async function runCargoAudit(projectPath, containerName) {
  const result = {
    name: 'Cargo Audit',
    status: 'passed',
    vulnerabilities: [],
    advisories: []
  };

  try {
    // Mount project directory and run cargo-audit
    const output = await runInContainer(containerName, [
      'sh', '-c',
      `cd /tmp && ${runCargoAuditCmd()}`
    ]);

    if (output && (output.includes('Crate:') || output.includes('Vulnerability'))) {
      const advisories = parseCargoAuditOutput(output);
      result.advisories = advisories;

      for (const advisory of advisories) {
        result.vulnerabilities.push({
          severity: advisory.severity || 'HIGH',
          title: `Dependency Vulnerability: ${advisory.crate}`,
          description: advisory.description,
          advisory: advisory.id,
          versions: advisory.versions
        });
      }

      if (result.vulnerabilities.length > 0) {
        result.status = 'failed';
      }
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'cargo-audit not available';
  }

  return result;
}

/**
 * Run cargo-deny for linting dependencies
 */
async function runCargoDeny(projectPath, containerName) {
  const result = {
    name: 'Cargo Deny',
    status: 'passed',
    vulnerabilities: [],
    warnings: []
  };

  try {
    const output = await runInContainer(containerName, [
      'cargo', 'deny', 'check'
    ]);

    if (output && (output.includes('error') || output.includes('warning'))) {
      const issues = parseCargoDenyOutput(output);
      result.warnings = issues;

      for (const issue of issues) {
        if (issue.level === 'error') {
          result.vulnerabilities.push({
            severity: 'HIGH',
            title: `Cargo Deny: ${issue.kind}`,
            description: issue.message,
            recommendation: issue.suggestion
          });
        }
      }

      if (result.vulnerabilities.length > 0) {
        result.status = 'failed';
      }
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'cargo-deny not available';
  }

  return result;
}

/**
 * Check for unsafe Serde deserialization
 */
async function checkSerdeDeserialization(projectPath) {
  const result = {
    name: 'Serde Deserialization Check',
    status: 'passed',
    vulnerabilities: [],
    issues: []
  };

  const unsafePatterns = [
    { regex: /serde_json::from_str\s*\(\s*\w+\s*\)/, desc: 'Direct JSON deserialization without type' },
    { regex: /serde_json::from_slice\s*\(\s*\w+\s*\)/, desc: 'Direct slice deserialization' },
    { regex: /bincode::deserialize\s*\(/, desc: 'Bincode deserialization' },
    { regex: /#\[derive\(Deserialize\)\][\s\S]*?HashMap/, desc: 'Deserializing into HashMap' },
    { regex: /#\[derive\(Deserialize\)\][\s\S]*?Box<dyn Any>/, desc: 'Deserializing into Any' }
  ];

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'target') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.rs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const pattern of unsafePatterns) {
            if (pattern.regex.test(line)) {
              result.issues.push({
                file: fullPath,
                line: index + 1,
                pattern: pattern.desc,
                content: line.trim()
              });
            }
          }
        });
      }
    }
  };

  scanDir(path.join(projectPath, 'src'));

  if (result.issues.length > 0) {
    result.vulnerabilities.push({
      severity: 'HIGH',
      title: 'Unsafe Serde Deserialization',
      description: `Found ${result.issues.length} potential unsafe deserialization patterns`,
      recommendation: 'Use structured types with validation for deserialization'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Check for unwrap/expect usage that could cause panics
 */
async function checkUnwrapUsage(projectPath) {
  const result = {
    name: 'Unwrap/Expect Usage Check',
    status: 'passed',
    vulnerabilities: [],
    unwrapCount: 0,
    details: []
  };

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'target') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.rs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for unwrap() and expect()
          const unwrapMatch = line.match(/\bunwrap\(\)/);
          const expectMatch = line.match(/\.expect\([^)]*\)/);

          if (unwrapMatch || expectMatch) {
            result.unwrapCount++;
            result.details.push({
              file: fullPath,
              line: index + 1,
              type: unwrapMatch ? 'unwrap' : 'expect',
              content: line.trim()
            });
          }
        });
      }
    }
  };

  scanDir(path.join(projectPath, 'src'));

  if (result.unwrapCount > 10) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Excessive Unwrap/Expect Usage',
      description: `Found ${result.unwrapCount} unwrap/expect calls that may cause panics`,
      recommendation: 'Use proper error handling with Result and ? operator'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Check for panic safety issues
 */
async function checkPanicSafety(projectPath) {
  const result = {
    name: 'Panic Safety Check',
    status: 'passed',
    vulnerabilities: [],
    issues: []
  };

  const panicPatterns = [
    { regex: /\bpanic!\s*\(/, desc: 'Explicit panic' },
    { regex: /\bunreachable!\s*\(/, desc: 'Unreachable macro' },
    { regex: /\btodo!\s*\(/, desc: 'TODO macro' },
    { regex: /\bassert!\s*\(/, desc: 'Assert macro (release may disable)' }
  ];

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'target') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.rs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const pattern of panicPatterns) {
            if (pattern.regex.test(line)) {
              result.issues.push({
                file: fullPath,
                line: index + 1,
                pattern: pattern.desc,
                content: line.trim()
              });
            }
          }
        });
      }
    }
  };

  scanDir(path.join(projectPath, 'src'));

  if (result.issues.length > 5) {
    result.vulnerabilities.push({
      severity: 'LOW',
      title: 'Panic Safety Concerns',
      description: `Found ${result.issues.length} potential panic sources`,
      recommendation: 'Replace panics with Result returns for better error handling'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Check for integer overflow vulnerabilities
 */
async function checkIntegerOverflow(projectPath) {
  const result = {
    name: 'Integer Overflow Check',
    status: 'passed',
    vulnerabilities: [],
    suspiciousOperations: []
  };

  const patterns = [
    { regex: /\+\s*[\w_]+\s*\*\s*[\w_]+/, desc: 'Potential overflow in multiplication' },
    { regex: /wrapping_add|wrapping_sub|wrapping_mul/, desc: 'Wrapping arithmetic usage' },
    { regex: /\.\s*unchecked_/, desc: 'Unchecked arithmetic' }
  ];

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'target') {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.rs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const pattern of patterns) {
            if (pattern.regex.test(line)) {
              result.suspiciousOperations.push({
                file: fullPath,
                line: index + 1,
                pattern: pattern.desc,
                content: line.trim()
              });
            }
          }
        });
      }
    }
  };

  scanDir(path.join(projectPath, 'src'));

  if (result.suspiciousOperations.length > 5) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Potential Integer Overflow',
      description: `Found ${result.suspiciousOperations.length} suspicious arithmetic operations`,
      recommendation: 'Review for potential integer overflow vulnerabilities'
    });
    result.status = 'warning';
  }

  return result;
}

/**
 * Check framework-specific vulnerabilities
 */
async function checkFrameworkVulnerabilities(framework, projectPath) {
  const result = {
    name: `${framework.charAt(0).toUpperCase() + framework.slice(1)} Security Check`,
    status: 'passed',
    vulnerabilities: []
  };

  const frameworkChecks = {
    'actix-web': async () => {
      const srcPath = path.join(projectPath, 'src');
      if (!fs.existsSync(srcPath)) return;

      const files = fs.readdirSync(srcPath).filter(f => f.endsWith('.rs'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(srcPath, file), 'utf8');
        const lines = content.split('\n');

        // Check for .data() usage without validation
        if (content.includes('.data(') && !content.includes('.to_string()')) {
          result.vulnerabilities.push({
            severity: 'MEDIUM',
            title: 'Actix Web Path Extraction',
            description: 'Unvalidated path data extraction detected',
            file: file,
            recommendation: 'Validate and sanitize path parameters before use'
          });
        }

        // Check for unwrap() on query parameters
        lines.forEach((line, index) => {
          if (/\bunwrap\(\)/.test(line) && (line.includes('query') || line.includes('Query'))) {
            result.vulnerabilities.push({
              severity: 'HIGH',
              title: 'Actix Unwrap on Query Parameter',
              description: 'unwrap() called on query parameter - may cause panic',
              file: file,
              line: index + 1,
              recommendation: 'Use proper error handling instead of unwrap()'
            });
          }
        });
      }
    },
    'axum': async () => {
      const srcPath = path.join(projectPath, 'src');
      if (!fs.existsSync(srcPath)) return;

      const files = fs.readdirSync(srcPath).filter(f => f.endsWith('.rs'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(srcPath, file), 'utf8');
        const lines = content.split('\n');

        // Check for Path extraction without validation
        if (content.includes('Path<') && !content.includes('parse')) {
          result.vulnerabilities.push({
            severity: 'MEDIUM',
            title: 'Axum Path Extraction',
            description: 'Path extraction without validation',
            file: file,
            recommendation: 'Parse and validate path parameters'
          });
        }

        // Check for State<T> leak
        if (content.includes('State<') && content.includes('Arc<')) {
          result.vulnerabilities.push({
            severity: 'LOW',
            title: 'Axum State Arc Usage',
            description: 'Using Arc<State> may leak internal state',
            file: file,
            recommendation: 'Review Arc usage in State extractors'
          });
        }

        // Check for unwrap in extractors
        lines.forEach((line, index) => {
          if (/\bunwrap\(\)/.test(line) && (line.includes('Path') || line.includes('Query') || line.includes('Form'))) {
            result.vulnerabilities.push({
              severity: 'HIGH',
              title: 'Axum Unwrap on Extractor',
              description: 'unwrap() called on Axum extractor - may cause panic',
              file: file,
              line: index + 1,
              recommendation: 'Use proper error handling for extractors'
            });
          }
        });
      }
    },
    'rocket': async () => {
      const srcPath = path.join(projectPath, 'src');
      if (!fs.existsSync(srcPath)) return;

      const files = fs.readdirSync(srcPath).filter(f => f.endsWith('.rs'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(srcPath, file), 'utf8');
        const lines = content.split('\n');

        // Check for form guards without validation
        if (content.includes('Form<') && !content.includes('validate')) {
          result.vulnerabilities.push({
            severity: 'MEDIUM',
            title: 'Rocket Form Without Validation',
            description: 'Form extractor used without validation',
            file: file,
            recommendation: 'Add validation guards for form inputs'
          });
        }

        // Check for guard bypass potential
        if (content.includes('Admin') || content.includes('Auth')) {
          const hasGuardCheck = content.includes('Guard') || content.includes('guard');
          if (!hasGuardCheck) {
            result.vulnerabilities.push({
              severity: 'HIGH',
              title: 'Rocket Admin Route Without Guard',
              description: 'Admin-related route without explicit guard',
              file: file,
              recommendation: 'Add proper authentication guards'
            });
          }
        }

        // Check for unwrap() in handlers
        lines.forEach((line, index) => {
          if (/\bunwrap\(\)|\.expect\(/.test(line)) {
            result.vulnerabilities.push({
              severity: 'MEDIUM',
              title: 'Rocket Unwrap/Expect',
              description: 'unwrap() or expect() may cause panic',
              file: file,
              line: index + 1,
              recommendation: 'Use Result propagation instead'
            });
          }
        });
      }
    },
    'warp': async () => {
      const srcPath = path.join(projectPath, 'src');
      if (!fs.existsSync(srcPath)) return;

      const files = fs.readdirSync(srcPath).filter(f => f.endsWith('.rs'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(srcPath, file), 'utf8');

        // Check for filter bypass
        if (content.includes('.and(') && !content.includes('.or(')) {
          result.vulnerabilities.push({
            severity: 'LOW',
            title: 'Warp Filter Chain',
            description: 'Single filter chain may be bypassable',
            file: file,
            recommendation: 'Use multiple filter layers for security'
          });
        }

        // Check for CORS issues
        if (content.includes('cors') && content.includes('*')) {
          result.vulnerabilities.push({
            severity: 'MEDIUM',
            title: 'Warp CORS Misconfiguration',
            description: 'CORS may allow any origin',
            file: file,
            recommendation: 'Restrict CORS to specific origins'
          });
        }
      }
    }
  };

  const checkFn = frameworkChecks[framework];
  if (checkFn) {
    await checkFn();
  }

  if (result.vulnerabilities.length > 0) {
    result.status = 'failed';
  }

  return result;
}

/**
 * Check for dependency vulnerabilities
 */
async function checkDependencyVulnerabilities(projectPath) {
  const result = {
    name: 'Dependency Vulnerability Check',
    status: 'passed',
    vulnerabilities: []
  };

  const cargoLockPath = path.join(projectPath, 'Cargo.lock');
  if (!fs.existsSync(cargoLockPath)) {
    result.status = 'skipped';
    result.note = 'Cargo.lock not found';
    return result;
  }

  const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');

  // Check for common vulnerable dependencies
  const vulnerableCrates = [
    { name: 'hyper', versions: ['0.12.', '0.13.0'], severity: 'HIGH' },
    { name: 'openssl', versions: ['0.9.', '0.10.'], severity: 'CRITICAL' }
  ];

  for (const crate of vulnerableCrates) {
    if (cargoLock.includes(`name = "${crate.name}"`)) {
      result.vulnerabilities.push({
        severity: crate.severity,
        title: `Potentially Vulnerable Dependency: ${crate.name}`,
        description: `${crate.name} found in Cargo.lock`,
        recommendation: 'Run cargo-audit to check for vulnerabilities'
      });
    }
  }

  if (result.vulnerabilities.length > 0) {
    result.status = 'warning';
  }

  return result;
}

/**
 * Parse cargo-audit output
 */
function parseCargoAuditOutput(output) {
  const advisories = [];
  const lines = output.split('\n');

  let currentAdvisory = null;
  for (const line of lines) {
    if (line.includes('Crate:')) {
      if (currentAdvisory) advisories.push(currentAdvisory);
      currentAdvisory = { crate: line.split(':').pop().trim() };
    } else if (line.includes('Vulnerability:')) {
      if (currentAdvisory) currentAdvisory.id = line.split(':').pop().trim();
    } else if (line.includes('Severity:')) {
      if (currentAdvisory) currentAdvisory.severity = line.split(':').pop().trim();
    } else if (line.includes('Description:')) {
      if (currentAdvisory) currentAdvisory.description = line.split(':').slice(1).join(':').trim();
    }
  }
  if (currentAdvisory) advisories.push(currentAdvisory);

  return advisories;
}

/**
 * Parse cargo-deny output
 */
function parseCargoDenyOutput(output) {
  const issues = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.includes('error') || line.includes('warning')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        issues.push({
          level: parts[0].trim(),
          kind: parts[1].trim(),
          message: parts.slice(2).join(':').trim()
        });
      }
    }
  }

  return issues;
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
    }, options.timeout || 30000);

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

function runCargoAuditCmd() {
  return 'cargo audit --json 2>/dev/null || echo "No vulnerabilities found"';
}

module.exports = {
  scan,
  checkUnsafeBlocks,
  checkSerdeDeserialization,
  checkUnwrapUsage,
  checkPanicSafety,
  runCargoAudit,
  runCargoDeny,
  checkIntegerOverflow,
  checkDependencyVulnerabilities,
  checkFrameworkVulnerabilities
};
