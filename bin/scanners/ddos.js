/**
 * DDoS Scanner
 *
 * Performs DDoS resistance testing
 */

const { spawn } = require('child_process');

/**
 * Scan target for DDoS resistance
 * @param {Object} detection - Detection info
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
async function scan(detection, options = {}) {
  const results = {
    name: 'DDoS Resistance Test',
    checks: [],
    vulnerabilities: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0
    }
  };

  const target = options.target || 'http://localhost:3000';
  const containerName = options.containerName || 'guardian-tools';
  const aggressive = options.aggressive === true;

  // Run DDoS tests
  const tests = [
    testHTTPFlood(target, containerName, aggressive),
    testSlowloris(target, containerName, aggressive),
    testConnectionExhaustion(target, containerName, aggressive),
    testRateLimitBypass(target, containerName)
  ];

  const testResults = await Promise.allSettled(tests);

  for (const testResult of testResults) {
    if (testResult.status === 'fulfilled' && testResult.value) {
      results.checks.push(testResult.value);
      results.summary.totalTests++;

      if (testResult.value.status === 'passed') {
        results.summary.passed++;
      } else {
        results.summary.failed++;
        if (testResult.value.vulnerabilities) {
          results.vulnerabilities.push(...testResult.value.vulnerabilities);
        }
      }
    }
  }

  return results;
}

/**
 * Test HTTP flood resistance
 */
async function testHTTPFlood(target, containerName, aggressive) {
  const result = {
    name: 'HTTP Flood Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      errorRate: 0
    }
  };

  const rate = aggressive ? 5000 : 500;
  const duration = aggressive ? 30 : 10;

  try {
    // Use vegeta for HTTP flood testing
    const targetsFile = '/tmp/httpflood_targets.txt';

    // Create targets file
    await runInContainer(containerName, [
      'sh', '-c',
      `echo "GET ${target}" > ${targetsFile}`
    ]);

    // Run vegeta attack
    const output = await runInContainer(containerName, [
      'sh', '-c',
      `vegeta attack -targets=${targetsFile} -rate=${rate} -duration=${duration}s | vegeta report`
    ], { timeout: (duration + 10) * 1000 });

    // Parse vegeta output
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Requests')) {
        const match = line.match(/[\d.]+/);
        if (match) result.metrics.totalRequests = parseInt(match[0], 10);
      }
      if (line.includes('Success')) {
        const match = line.match(/[\d.]+/);
        if (match) result.metrics.successfulRequests = parseFloat(match[0]);
      }
      if (line.includes('Latency')) {
        const match = line.match(/[\d.]+/);
        if (match) result.metrics.avgResponseTime = parseFloat(match[0]);
      }
    }

    result.metrics.failedRequests = result.metrics.totalRequests - result.metrics.successfulRequests;
    result.metrics.errorRate = result.metrics.totalRequests > 0
      ? result.metrics.failedRequests / result.metrics.totalRequests
      : 0;

    // Check if error rate is too high (> 10%)
    if (result.metrics.errorRate > 0.1) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'Vulnerable to HTTP Flood',
        description: `Server failed with ${(result.metrics.errorRate * 100).toFixed(1)}% error rate under ${rate} req/s load`,
        metrics: result.metrics,
        recommendation: 'Implement rate limiting and consider DDoS protection service'
      });
      result.status = 'failed';
    }

    // Clean up targets file
    await runInContainer(containerName, ['rm', '-f', targetsFile]);
  } catch (error) {
    result.status = 'skipped';
    result.note = 'Vegeta not available or test failed';
  }

  return result;
}

/**
 * Test slowloris attack resistance
 */
async function testSlowloris(target, containerName, aggressive) {
  const result = {
    name: 'Slowloris Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      connections: aggressive ? 500 : 100,
      timeouts: 0,
      successRate: 0
    }
  };

  try {
    // Use slowhttptest if available, otherwise basic test
    const url = new URL(target);
    const host = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);

    const output = await runInContainer(containerName, [
      'slowhttptest',
      '-c', result.metrics.connections.toString(),
      '-H', host,
      '-p', port.toString(),
      '-B', '-l', aggressive ? '60' : '30',
      '-i', '10',
      '-r', url.protocol === 'https:' ? '1' : '0',
      '-s', '8192'
    ], { timeout: 70000 });

    if (output && output.includes('No connections have failed')) {
      result.status = 'passed';
    } else if (output && output.includes('connections have failed')) {
      const match = output.match(/(\d+) connections have failed/);
      if (match) {
        result.metrics.timeouts = parseInt(match[0], 10);
        result.metrics.successRate = 1 - (result.metrics.timeouts / result.metrics.connections);
      }

      if (result.metrics.timeouts > result.metrics.connections * 0.5) {
        result.vulnerabilities.push({
          severity: 'HIGH',
          title: 'Vulnerable to Slowloris',
          description: `${result.metrics.timeouts} connections failed out of ${result.metrics.connections}`,
          metrics: result.metrics,
          recommendation: 'Configure request timeout and limit connection duration'
        });
        result.status = 'failed';
      }
    }
  } catch (error) {
    // slowhttptest may not be available, use alternative
    result.status = 'skipped';
    result.note = 'SlowHTTPTest not available';
  }

  return result;
}

/**
 * Test connection exhaustion
 */
async function testConnectionExhaustion(target, containerName, aggressive) {
  const result = {
    name: 'Connection Exhaustion Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      concurrentConnections: aggressive ? 1000 : 200,
      successfulConnections: 0,
      rejectedConnections: 0
    }
  };

  try {
    // Use hey for connection testing
    const output = await runInContainer(containerName, [
      'hey', '-n', result.metrics.concurrentConnections.toString(),
      '-c', aggressive ? '100' : '50',
      '-z', '30s',
      '-o', 'csv',
      target
    ], { timeout: 40000 });

    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Status:')) {
        const match = line.match(/(\d+)/);
        if (match) {
          const status = parseInt(match[0], 10);
          if (status >= 500) {
            result.metrics.rejectedConnections++;
          } else {
            result.metrics.successfulConnections++;
          }
        }
      }
    }

    if (result.metrics.rejectedConnections > result.metrics.successfulConnections * 0.1) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Connection Pool Exhaustion',
        description: `${result.metrics.rejectedConnections} connections rejected`,
        metrics: result.metrics,
        recommendation: 'Increase connection pool size and implement connection limits'
      });
      result.status = 'failed';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'hey not available or test failed';
  }

  return result;
}

/**
 * Test rate limit bypass
 */
async function testRateLimitBypass(target, containerName) {
  const result = {
    name: 'Rate Limit Bypass Test',
    status: 'passed',
    vulnerabilities: [],
    bypasses: []
  };

  const bypassAttempts = [
    {
      name: 'X-Forwarded-For',
      headers: { 'X-Forwarded-For': '127.0.0.1' }
    },
    {
      name: 'X-Real-IP',
      headers: { 'X-Real-IP': '127.0.0.1' }
    },
    {
      name: 'User-Agent Rotation',
      headers: { 'User-Agent': 'RateLimitBypass/1.0' }
    },
    {
      name: 'X-Original-URI',
      headers: { 'X-Original-URI': '/admin' }
    }
  ];

  const testEndpoint = `${target}/api/limited`;

  for (const bypass of bypassAttempts) {
    let blockedRequests = 0;
    let successfulRequests = 0;

    // Send 20 requests with bypass header
    for (let i = 0; i < 20; i++) {
      try {
        const headers = Object.entries(bypass.headers)
          .map(([k, v]) => `-H "${k}: ${v}"`)
          .join(' ');

        const output = await runInContainer(containerName, [
          'curl', '-s', '-o', '/dev/null',
          '-w', '%{http_code}',
          headers.split(' '),
          testEndpoint
        ], { timeout: 2000 });

        if (output === '429' || output === '403') {
          blockedRequests++;
        } else if (output === '200' || output === '201') {
          successfulRequests++;
        }
      } catch {
        // Request failed
      }
    }

    // If more than 5 requests succeeded after rate limit should have kicked in
    if (successfulRequests > 5) {
      result.bypasses.push({
        technique: bypass.name,
        successfulRequests,
        blockedRequests
      });
    }
  }

  if (result.bypasses.length > 0) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Rate Limit Bypass Possible',
      description: `Found ${result.bypasses.length} rate limit bypass techniques`,
      bypasses: result.bypasses,
      recommendation: 'Implement proper rate limiting based on connection, not headers'
    });
    result.status = 'failed';
  }

  return result;
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

module.exports = {
  scan,
  testHTTPFlood,
  testSlowloris,
  testConnectionExhaustion,
  testRateLimitBypass
};
