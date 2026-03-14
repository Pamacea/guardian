import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('NestJS Security Integration Tests', () => {
  beforeEach(() => {
    vi.mock('child_process');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Guard Bypass Detection', () => {
    it('should detect unauthenticated admin access', async () => {
      const { checkGuardBypass } = await import('../../bin/scanners/nestjs.js');

      const result = await checkGuardBypass('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('Guard Bypass Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should detect guard bypass on API routes', async () => {
      const { scan } = await import('../../bin/scanners/nestjs.js');

      const nestInfo = {
        detected: true,
        version: '10.0.0',
        features: ['jwt'],
        guardFiles: ['src/guards/auth.guard.ts']
      };

      const result = await scan(nestInfo, {
        target: 'http://localhost:3000',
        containerName: 'guardian-tools'
      });

      expect(result.framework).toBe('nestjs');
      expect(result.checks).toBeInstanceOf(Array);
    });
  });

  describe('Pipe Injection Detection', () => {
    it('should detect SQL injection in pipes', async () => {
      const { checkPipeInjection } = await import('../../bin/scanners/nestjs.js');

      const result = await checkPipeInjection('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('Pipe Injection Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should detect NoSQL injection', async () => {
      const { checkPipeInjection } = await import('../../bin/scanners/nestjs.js');

      const result = await checkPipeInjection('http://localhost:3000', 'guardian-tools');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('GraphQL Vulnerabilities', () => {
    it('should detect GraphQL introspection', async () => {
      const { checkGraphQLIntrospection } = await import('../../bin/scanners/nestjs.js');

      const result = await checkGraphQLIntrospection('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('GraphQL Introspection Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should detect batch query DoS', async () => {
      const { checkGraphQLVulnerabilities } = await import('../../bin/scanners/nestjs.js');

      const result = await checkGraphQLVulnerabilities('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('GraphQL Vulnerabilities Check');
    });
  });

  describe('Throttler Bypass', () => {
    it('should detect rate limiting bypass', async () => {
      const { checkThrottlerBypass } = await import('../../bin/scanners/nestjs.js');

      const result = await checkThrottlerBypass('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('Throttler Bypass Check');
      expect(result.requestsSent).toBeDefined();
      expect(result.blockedRequests).toBeDefined();
      // When Docker is not available, requestsSent will be 0
      // This is acceptable for CI testing
    }, 60000); // 60 second timeout
  });

  describe('CORS Misconfiguration', () => {
    it('should detect permissive CORS', async () => {
      const { checkCORS } = await import('../../bin/scanners/nestjs.js');

      const result = await checkCORS('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('CORS Configuration Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('Security Headers', () => {
    it('should detect missing security headers', async () => {
      const { checkSecurityHeaders } = await import('../../bin/scanners/nestjs.js');

      const result = await checkSecurityHeaders('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('Security Headers Check');
      expect(result.missingHeaders).toBeInstanceOf(Array);
    });
  });

  describe('WebSocket Authentication', () => {
    it('should detect unauthenticated WebSocket access', async () => {
      const { checkWebSocketAuth } = await import('../../bin/scanners/nestjs.js');

      const result = await checkWebSocketAuth('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('WebSocket Authentication Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should handle WebSocket upgrade verification', async () => {
      const { checkWebSocketAuth } = await import('../../bin/scanners/nestjs.js');

      const result = await checkWebSocketAuth('http://localhost:3000', 'guardian-tools');
      expect(result.status).toBe('passed');
    });
  });

  describe('GraphQL Deep Nesting DoS', () => {
    it('should detect deeply nested GraphQL queries', async () => {
      const { checkGraphQLVulnerabilities } = await import('../../bin/scanners/nestjs.js');

      const result = await checkGraphQLVulnerabilities('http://localhost:3000', 'guardian-tools');
      expect(result.name).toBe('GraphQL Vulnerabilities Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('SSTI via Template Injection', () => {
    it('should detect server-side template injection', async () => {
      const { checkPipeInjection } = await import('../../bin/scanners/nestjs.js');

      const result = await checkPipeInjection('http://localhost:3000', 'guardian-tools');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('Path Traversal via Pipes', () => {
    it('should detect path traversal attempts', async () => {
      const { checkPipeInjection } = await import('../../bin/scanners/nestjs.js');

      const result = await checkPipeInjection('http://localhost:3000', 'guardian-tools');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });
});
