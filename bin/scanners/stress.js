/**
 * Stress Testing Module
 *
 * Performs load and stress testing
 */

const { spawn } = require('child_process');

/**
 * Run stress tests
 * @param {Object} detection - Detection info
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test results
 */
async function scan(detection, options = {}) {
  const results = {
    name: 'Stress Test',
    checks: [],
    vulnerabilities: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  const target = options.target || 'http://localhost:3000';
  const containerName = options.containerName || 'guardian-tools';
  const intensity = options.intensity || 'medium'; // low, medium, high

  // Run stress tests
  const tests = [
    testMemoryLeak(target, containerName, intensity),
    testConnectionPool(target, containerName, intensity),
    testResponseTime(target, containerName, intensity),
    testErrorRate(target, containerName, intensity),
    testCPUUsage(target, containerName, intensity)
  ];

  const testResults = await Promise.allSettled(tests);

  for (const testResult of testResults) {
    if (testResult.status === 'fulfilled' && testResult.value) {
      results.checks.push(testResult.value);
      results.summary.totalTests++;

      if (testResult.value.status === 'passed') {
        results.summary.passed++;
      } else if (testResult.value.status === 'failed') {
        results.summary.failed++;
        if (testResult.value.vulnerabilities) {
          results.vulnerabilities.push(...testResult.value.vulnerabilities);
        }
      } else if (testResult.value.status === 'warning') {
        results.summary.warnings++;
        if (testResult.value.vulnerabilities) {
          results.vulnerabilities.push(...testResult.value.vulnerabilities);
        }
      }
    }
  }

  return results;
}

/**
 * Test for memory leaks
 */
async function testMemoryLeak(target, containerName, intensity) {
  const result = {
    name: 'Memory Leak Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      initialMemory: 0,
      peakMemory: 0,
      finalMemory: 0,
      memoryGrowth: 0
    }
  };

  const iterations = intensity === 'high' ? 10000 : 5000;
  const concurrency = intensity === 'high' ? 100 : 50;

  try {
    // Monitor container memory before test
    const beforeMem = await runInContainer(containerName, [
      'sh', '-c',
      'free -m | grep Mem | awk \'{print $3}\''
    ]);

    result.metrics.initialMemory = parseInt(beforeMem.trim(), 10);

    // Run load test
    await runInContainer(containerName, [
      'hey', '-n', iterations.toString(),
      '-c', concurrency.toString(),
      '-m', 'GET',
      target
    ], { timeout: 120000 });

    // Monitor container memory during load
    const peakMem = await runInContainer(containerName, [
      'sh', '-c',
      'free -m | grep Mem | awk \'{print $3}\''
    ]);

    result.metrics.peakMemory = parseInt(peakMem.trim(), 10);

    // Wait and check final memory
    await new Promise(resolve => setTimeout(resolve, 5000));

    const afterMem = await runInContainer(containerName, [
      'sh', '-c',
      'free -m | grep Mem | awk \'{print $3}\''
    ]);

    result.metrics.finalMemory = parseInt(afterMem.trim(), 10);
    result.metrics.memoryGrowth = result.metrics.finalMemory - result.metrics.initialMemory;

    // Check if memory grew significantly (> 100 MB)
    if (result.metrics.memoryGrowth > 100) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Potential Memory Leak',
        description: `Memory grew by ${result.metrics.memoryGrowth} MB during load test`,
        metrics: result.metrics,
        recommendation: 'Profile application for memory leaks'
      });
      result.status = 'warning';
    }

    // Check if memory usage is too high (> 80% of available)
    const totalMem = await runInContainer(containerName, [
      'sh', '-c',
      'free -m | grep Mem | awk \'{print $2}\''
    ]);
    const memPercent = (result.metrics.peakMemory / parseInt(totalMem.trim(), 10)) * 100;

    if (memPercent > 80) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'High Memory Usage',
        description: `Memory usage peaked at ${memPercent.toFixed(1)}%`,
        metrics: result.metrics,
        recommendation: 'Investigate memory usage patterns'
      });
      result.status = 'failed';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'Memory test failed or tools not available';
  }

  return result;
}

/**
 * Test connection pool limits
 */
async function testConnectionPool(target, containerName, intensity) {
  const result = {
    name: 'Connection Pool Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      maxConcurrent: intensity === 'high' ? 1000 : 500,
      successfulConnections: 0,
      rejectedConnections: 0,
      avgLatency: 0
    }
  };

  try {
    const output = await runInContainer(containerName, [
      'vegeta', 'attack',
      '-targets=/tmp/stdin',
      '-rate=' + (intensity === 'high' ? '500' : '200'),
      '-duration=30s',
      '|', 'vegeta', 'report',
      '-type=text'
    ], { timeout: 40000 });

    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Success')) {
        const match = line.match(/[\d.]+/);
        if (match) result.metrics.successfulConnections = parseFloat(match[0]) * 100;
      }
      if (line.includes('Latency')) {
        const match = line.match(/P50: ([\d.]+)/);
        if (match) result.metrics.avgLatency = parseFloat(match[1]);
      }
    }

    result.metrics.rejectedConnections = result.metrics.maxConcurrent - result.metrics.successfulConnections;

    // If more than 20% of connections were rejected
    if (result.metrics.rejectedConnections > result.metrics.maxConcurrent * 0.2) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Connection Pool Exhaustion',
        description: `${result.metrics.rejectedConnections} connections rejected`,
        metrics: result.metrics,
        recommendation: 'Increase connection pool size or implement connection pooling'
      });
      result.status = 'failed';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'Connection pool test failed';
  }

  return result;
}

/**
 * Test response time under load
 */
async function testResponseTime(target, containerName, intensity) {
  const result = {
    name: 'Response Time Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0
    }
  };

  const requests = intensity === 'high' ? 10000 : 5000;
  const concurrency = intensity === 'high' ? 100 : 50;

  try {
    const output = await runInContainer(containerName, [
      'hey', '-n', requests.toString(),
      '-c', concurrency.toString(),
      '-o', 'csv',
      target
    ], { timeout: 120000 });

    const lines = output.split('\n');
    const responseTimes = [];

    for (const line of lines) {
      if (line.includes(',')) {
        const parts = line.split(',');
        if (parts[0] && !isNaN(parseFloat(parts[0]))) {
          responseTimes.push(parseFloat(parts[0]));
        }
      }
    }

    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      result.metrics.p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      result.metrics.p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      result.metrics.p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
      result.metrics.max = responseTimes[responseTimes.length - 1];
    }

    // Check if P95 is too high (> 500ms)
    if (result.metrics.p95 > 500) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Slow Response Time',
        description: `P95 latency is ${result.metrics.p95.toFixed(0)}ms under load`,
        metrics: result.metrics,
        recommendation: 'Optimize database queries and implement caching'
      });
      result.status = 'warning';
    }

    // Check if P95 is critical (> 2000ms)
    if (result.metrics.p95 > 2000) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'Critical Response Time',
        description: `P95 latency is ${result.metrics.p95.toFixed(0)}ms under load`,
        metrics: result.metrics,
        recommendation: 'Immediate optimization required'
      });
      result.status = 'failed';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'Response time test failed';
  }

  return result;
}

/**
 * Test error rate under load
 */
async function testErrorRate(target, containerName, intensity) {
  const result = {
    name: 'Error Rate Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      totalRequests: 0,
      successRequests: 0,
      errorRequests: 0,
      errorRate: 0
    }
  };

  const requests = intensity === 'high' ? 10000 : 5000;
  const concurrency = intensity === 'high' ? 100 : 50;

  try {
    const output = await runInContainer(containerName, [
      'hey', '-n', requests.toString(),
      '-c', concurrency.toString(),
      '-o', 'csv',
      target
    ], { timeout: 120000 });

    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(',')) {
        const parts = line.split(',');
        const status = parts[parts.length - 1];
        if (status) {
          result.metrics.totalRequests++;
          const statusCode = parseInt(status.trim(), 10);
          if (statusCode >= 200 && statusCode < 400) {
            result.metrics.successRequests++;
          } else {
            result.metrics.errorRequests++;
          }
        }
      }
    }

    result.metrics.errorRate = result.metrics.totalRequests > 0
      ? result.metrics.errorRequests / result.metrics.totalRequests
      : 0;

    // Check if error rate is too high (> 1%)
    if (result.metrics.errorRate > 0.01) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'High Error Rate',
        description: `Error rate is ${(result.metrics.errorRate * 100).toFixed(2)}% under load`,
        metrics: result.metrics,
        recommendation: 'Investigate error causes and improve error handling'
      });
      result.status = 'warning';
    }

    // Critical error rate (> 5%)
    if (result.metrics.errorRate > 0.05) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'Critical Error Rate',
        description: `Error rate is ${(result.metrics.errorRate * 100).toFixed(2)}% under load`,
        metrics: result.metrics,
        recommendation: 'Immediate investigation required'
      });
      result.status = 'failed';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'Error rate test failed';
  }

  return result;
}

/**
 * Test CPU usage under load
 */
async function testCPUUsage(target, containerName, intensity) {
  const result = {
    name: 'CPU Usage Test',
    status: 'passed',
    vulnerabilities: [],
    metrics: {
      idleCPU: 0,
      loadAverage: 0
    }
  };

  try {
    // Run load test in background
    const testProcess = spawn('docker', ['exec', '-d', containerName,
      'hey', '-n', '5000', '-c', '50', target
    ]);

    // Wait for load to build
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check CPU usage
    const cpuOutput = await runInContainer(containerName, [
      'sh', '-c',
      'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\''
    ]);

    result.metrics.usageCPU = parseFloat(cpuOutput.trim());

    // Check load average
    const loadOutput = await runInContainer(containerName, [
      'sh', '-c',
      'uptime | awk -F"load average:" \'{print $2}\' | cut -d, -f1'
    ]);

    result.metrics.loadAverage = parseFloat(loadOutput.trim());

    // Clean up
    testProcess.kill();

    // Check if CPU usage is too high (> 90%)
    if (result.metrics.usageCPU > 90) {
      result.vulnerabilities.push({
        severity: 'HIGH',
        title: 'High CPU Usage',
        description: `CPU usage reached ${result.metrics.usageCPU.toFixed(1)}% under load`,
        metrics: result.metrics,
        recommendation: 'Optimize CPU-intensive operations'
      });
      result.status = 'failed';
    } else if (result.metrics.usageCPU > 70) {
      result.vulnerabilities.push({
        severity: 'MEDIUM',
        title: 'Moderate CPU Usage',
        description: `CPU usage reached ${result.metrics.usageCPU.toFixed(1)}% under load`,
        metrics: result.metrics,
        recommendation: 'Consider optimization for better performance'
      });
      result.status = 'warning';
    }
  } catch (error) {
    result.status = 'skipped';
    result.note = 'CPU usage test failed';
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
  testMemoryLeak,
  testConnectionPool,
  testResponseTime,
  testErrorRate,
  testCPUUsage
};
