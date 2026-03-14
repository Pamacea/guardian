/**
 * NestJS Security Scanner
 *
 * Performs security checks specific to NestJS applications
 */

const { spawn } = require('child_process');

/**
 * Scan NestJS application for vulnerabilities
 * @param {Object} nestInfo - NestJS detection info
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
async function scan(nestInfo, options = {}) {
  const results = {
    framework: 'nestjs',
    version: nestInfo.version,
    checks: [],
    vulnerabilities: [],
    features: nestInfo.features || []
  };

  const target = options.target || 'http://localhost:3000';
  const containerName = options.containerName || 'guardian-tools';

  // Run NestJS-specific checks
  const checks = [
    checkGuardBypass(target, containerName),
    checkPipeInjection(target, containerName),
    checkGraphQLIntrospection(target, containerName),
    checkThrottlerBypass(target, containerName),
    checkCORS(target, containerName),
    checkSecurityHeaders(target, containerName)
  ];

  if (nestInfo.graphqlEnabled) {
    checks.push(checkGraphQLVulnerabilities(target, containerName));
  }

  if (nestInfo.webSocketEnabled) {
    checks.push(checkWebSocketAuth(target, containerName));
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
 * Check for guard bypass vulnerabilities
 */
async function checkGuardBypass(target, containerName) {
  const result = {
    name: 'Guard Bypass Check',
    status: 'passed',
    vulnerabilities: []
  };

  // Test bypass attempts
  const bypassTests = [
    { path: '/admin', method: 'GET', description: 'Admin route without auth' },
    { path: '/api/users', method: 'GET', description: 'User list without auth' },
    { path: '/api/config', method: 'GET', description: 'Config endpoint exposure' }
  ];

  for (const test of bypassTests) {
    try {
      const output = await runInContainer(containerName, [
        'httpie', '--ignore-stdin', 'GET',
        `${target}${test.path}`
      ]);

      if (output && (output.includes('200') || output.includes('data'))) {
        result.vulnerabilities.push({
          severity: 'HIGH',
          title: 'Guard Bypass',
          description: `${test.description} accessible without authentication`,
          endpoint: `${test.method} ${test.path}`
        });
        result.status = 'failed';
      }
    } catch {
      // Request failed (expected for protected routes)
    }
  }

  return result;
}

/**
 * Check for pipe injection vulnerabilities
 */
async function checkPipeInjection(target, containerName) {
  const result = {
    name: 'Pipe Injection Check',
    status: 'passed',
    vulnerabilities: []
  };

  const injectionTests = [
    { param: '?query=', payload: "' OR 1=1--", description: 'SQL injection' },
    { param: '?query=', payload: '{"$ne": null}', description: 'NoSQL injection' },
    { param: '?query=', payload: '{{7*7}}', description: 'Template injection' },
    { param: '?id=', payload: '../../../etc/passwd', description: 'Path traversal' }
  ];

  for (const test of injectionTests) {
    try {
      const url = `${target}/api/search${test.param}${encodeURIComponent(test.payload)}`;
      const output = await runInContainer(containerName, [
        'httpie', '--ignore-stdin', 'GET', url
      ]);

      if (output && (output.includes('root:') || output.includes('error') || output.includes('<'))) {
        result.vulnerabilities.push({
          severity: 'CRITICAL',
          title: 'Pipe Injection',
          description: `${test.description} via validation pipe`,
          endpoint: `GET /api/search${test.param}`,
          payload: test.payload
        });
        result.status = 'failed';
      }
    } catch {
      // Request failed or blocked
    }
  }

  return result;
}

/**
 * Check for GraphQL introspection
 */
async function checkGraphQLIntrospection(target, containerName) {
  const result = {
    name: 'GraphQL Introspection Check',
    status: 'passed',
    vulnerabilities: []
  };

  const introspectionQuery = JSON.stringify({
    query: `{
      __schema {
        types {
          name
          fields {
            name
            type {
              name
            }
          }
        }
      }
    }`
  });

  try {
    const output = await runInContainer(containerName, [
      'httpie', '--ignore-stdin', 'POST',
      `${target}/graphql`,
      `body=${introspectionQuery}`
    ]);

    if (output && (output.includes('__schema') || output.includes('types'))) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'GraphQL Introspection Enabled',
        description: 'GraphQL introspection reveals full schema',
        endpoint: 'POST /graphql',
        recommendation: 'Disable introspection in production'
      });
      result.status = 'failed';
    }
  } catch {
    // GraphQL endpoint may not exist or introspection disabled
  }

  return result;
}

/**
 * Check for throttler bypass
 */
async function checkThrottlerBypass(target, containerName) {
  const result = {
    name: 'Throttler Bypass Check',
    status: 'passed',
    vulnerabilities: [],
    requestsSent: 0,
    blockedRequests: 0
  };

  // Send 100 rapid requests
  for (let i = 0; i < 100; i++) {
    try {
      const output = await runInContainer(containerName, [
        'httpie', '--ignore-stdin', 'GET',
        `${target}/api/limited`,
        '--timeout', '1'
      ], { timeout: 2000 });

      result.requestsSent++;
      if (output && output.includes('429')) {
        result.blockedRequests++;
      }
    } catch {
      // Request failed
    }
  }

  // If less than 10% were blocked, throttling may be misconfigured
  if (result.requestsSent > 50 && result.blockedRequests < result.requestsSent * 0.1) {
    result.vulnerabilities.push({
      severity: 'MEDIUM',
      title: 'Rate Limiting Bypass',
      description: 'Rate limiting not effective (100 requests sent, < 10% blocked)',
      recommendation: 'Configure @nestjs/throttler with strict limits'
    });
    result.status = 'failed';
  }

  return result;
}

/**
 * Check CORS configuration
 */
async function checkCORS(target, containerName) {
  const result = {
    name: 'CORS Configuration Check',
    status: 'passed',
    vulnerabilities: []
  };

  try {
    const output = await runInContainer(containerName, [
      'httpie', '--ignore-stdin', 'GET', target,
      'Origin:evil.com'
    ]);

    if (output && (output.includes('access-control-allow-origin: *') ||
                   output.includes('access-control-allow-origin: evil.com') ||
                   output.includes('access-control-allow-credentials: true'))) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'CORS Misconfiguration',
        description: 'Overly permissive CORS policy detected',
        recommendation: 'Restrict CORS to trusted origins only'
      });
      result.status = 'failed';
    }
  } catch {
    // Request failed
  }

  return result;
}

/**
 * Check security headers
 */
async function checkSecurityHeaders(target, containerName) {
  const result = {
    name: 'Security Headers Check',
    status: 'passed',
    vulnerabilities: [],
    missingHeaders: []
  };

  const requiredHeaders = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'content-security-policy',
    'x-xss-protection',
    'referrer-policy'
  ];

  try {
    const output = await runInContainer(containerName, [
      'httpie', '--ignore-stdin', 'GET', target
    ]);

    for (const header of requiredHeaders) {
      if (!output || !output.toLowerCase().includes(header)) {
        result.missingHeaders.push(header);
      }
    }

    if (result.missingHeaders.length > 3) {
      result.vulnerabilities.push({
        severity: 'LOW',
        title: 'Missing Security Headers',
        description: `Missing headers: ${result.missingHeaders.join(', ')}`,
        recommendation: 'Use helmet middleware to add security headers'
      });
      result.status = 'failed';
    }
  } catch {
    // Request failed
  }

  return result;
}

/**
 * Check for WebSocket authentication
 */
async function checkWebSocketAuth(target, containerName) {
  const result = {
    name: 'WebSocket Authentication Check',
    status: 'passed',
    vulnerabilities: []
  };

  const wsUrl = target.replace('http', 'ws') + '/ws';

  try {
    const output = await runInContainer(containerName, [
      'curl', '-s', '-i', '-N',
      '-H', 'Connection: Upgrade',
      '-H', 'Upgrade: websocket',
      '-H', 'Sec-WebSocket-Version: 13',
      '-H', `Sec-WebSocket-Key: ${Buffer.from('test').toString('base64')}`,
      wsUrl
    ]);

    if (output && output.includes('101 Switching Protocols')) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'Unauthenticated WebSocket Access',
        description: 'WebSocket connection accepted without authentication',
        endpoint: wsUrl,
        recommendation: 'Implement WebSocket authentication guards'
      });
      result.status = 'failed';
    }
  } catch {
    // WebSocket endpoint may not exist
  }

  return result;
}

/**
 * Check for GraphQL-specific vulnerabilities
 */
async function checkGraphQLVulnerabilities(target, containerName) {
  const result = {
    name: 'GraphQL Vulnerabilities Check',
    status: 'passed',
    vulnerabilities: []
  };

  const attacks = [
    {
      name: 'Batch Query DoS',
      query: JSON.stringify({
        query: `{
          ${Array(100).fill(0).map((_, i) => `user${i}: user(id: ${i}) { id email }`).join('\n')}
        }`
      })
    },
    {
      name: 'Deep Nesting DoS',
      query: JSON.stringify({
        query: `{
          user(id: 1) {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      id
                    }
                  }
                }
              }
            }
          }
        }`
      })
    }
  ];

  for (const attack of attacks) {
    try {
      const output = await runInContainer(containerName, [
        'httpie', '--ignore-stdin', 'POST',
        `${target}/graphql`,
        `body=${attack.query}`,
        '--timeout', '5'
      ], { timeout: 10000 });

      if (output && output.includes('200')) {
        result.vulnerabilities.push({
          severity: 'MEDIUM',
          title: `GraphQL ${attack.name}`,
          description: 'GraphQL query depth/batch limits not configured',
          recommendation: 'Configure query complexity and depth limits'
        });
        result.status = 'failed';
      }
    } catch {
      // Request blocked or timed out
    }
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
    }, options.timeout || 5000);

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
  checkGuardBypass,
  checkPipeInjection,
  checkGraphQLIntrospection,
  checkThrottlerBypass,
  checkCORS,
  checkSecurityHeaders,
  checkWebSocketAuth,
  checkGraphQLVulnerabilities
};
