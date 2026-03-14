/**
 * Scanner Module - Orchestrator
 *
 * Coordinates security scanning for different frameworks
 */

const nestjsScanner = require('./nestjs');
const rustScanner = require('./rust');
const viteScanner = require('./vite');
const ddosScanner = require('./ddos');
const stressScanner = require('./stress');

/**
 * Run security scan based on detected framework
 * @param {Object} detection - Detection result
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
async function runSecurityScan(detection, options = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    target: detection.path,
    scans: [],
    vulnerabilities: [],
    summary: {}
  };

  const scanTasks = [];

  // Framework-specific scans
  if (detection.details.nestjs?.detected) {
    scanTasks.push(scanNestJS(detection, options));
  }

  if (detection.details.rust?.detected) {
    scanTasks.push(scanRust(detection, options));
  }

  if (detection.details.vite?.detected) {
    scanTasks.push(scanVite(detection, options));
  }

  // DDoS and stress tests (if enabled)
  if (options.includeDDoS !== false) {
    scanTasks.push(scanDDoS(detection, options));
  }

  if (options.includeStress !== false) {
    scanTasks.push(runStressTest(detection, options));
  }

  // Run scans in parallel
  const scanResults = await Promise.allSettled(scanTasks);

  // Aggregate results
  for (const scanResult of scanResults) {
    if (scanResult.status === 'fulfilled' && scanResult.value) {
      results.scans.push(scanResult.value);
      if (scanResult.value.vulnerabilities) {
        results.vulnerabilities.push(...scanResult.value.vulnerabilities);
      }
    }
  }

  // Generate summary
  results.summary = {
    totalScans: results.scans.length,
    totalVulnerabilities: results.vulnerabilities.length,
    critical: results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
    high: results.vulnerabilities.filter(v => v.severity === 'HIGH').length,
    medium: results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
    low: results.vulnerabilities.filter(v => v.severity === 'LOW').length
  };

  return results;
}

async function scanNestJS(detection, options) {
  return nestjsScanner.scan(detection.details.nestjs, options);
}

async function scanRust(detection, options) {
  return rustScanner.scan(detection.details.rust, options);
}

async function scanVite(detection, options) {
  return viteScanner.scan(detection.details.vite, options);
}

async function scanDDoS(detection, options) {
  return ddosScanner.scan(detection, options);
}

async function runStressTest(detection, options) {
  return stressScanner.scan(detection, options);
}

module.exports = {
  runSecurityScan,
  scanNestJS,
  scanRust,
  scanVite,
  scanDDoS,
  runStressTest
};
