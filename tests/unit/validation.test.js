import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to avoid output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Validation Module', () => {
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('validateUrl() function', () => {
    const getValidateUrl = async () => {
      return (await import('../../bin/validation.js')).validateUrl;
    };

    it('should validate URLs with various formats', async () => {
      const validateUrl = await getValidateUrl();

      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://api.example.com',
        'https://192.168.1.1', // This is valid format but blocked by SSRF protection
        'http://sub.domain.example.com:8080/path',
        'https://example.com?param=value',
        'https://example.com/path?foo=bar&baz=qux',
        'https://example.com#section',
        'https://example.com/path#anchor',
      ];

      // These should pass format validation
      validUrls.forEach((url) => {
        const result = validateUrl(url);
        if (url.includes('192.168') || url.includes('169.254')) {
          // These are blocked by SSRF protection
          expect(result.valid).toBe(false);
        } else {
          expect(result.valid, `${url} should be valid`).toBe(true);
        }
      });
    });

    it('should reject invalid URL formats', async () => {
      const validateUrl = await getValidateUrl();

      const invalidUrls = [
        'example.com',
        'www.example.com',
        '//example.com',
        'ftp://example.com',
        'mailto:test@example.com',
        'not-a-url',
        '',
        'https:/example.com',
        'https://',
      ];

      invalidUrls.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid, `${url} should be invalid`).toBe(false);
        expect(result.error).not.toBeNull();
      });
    });

    it('should block SSRF attempts to localhost', async () => {
      const validateUrl = await getValidateUrl();

      const blockedUrls = [
        'http://localhost',
        'http://127.0.0.1',
        'http://0.0.0.0',
        'http://[::1]',
        'http://169.254.169.254',
        'http://metadata.google.internal',
      ];

      blockedUrls.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid, `${url} should be blocked`).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });

    it('should block private IP ranges', async () => {
      const validateUrl = await getValidateUrl();

      const privateUrls = [
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://172.31.255.255',
        'http://192.168.1.1',
      ];

      privateUrls.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid, `${url} should be blocked`).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });

    it('should reject non-string input', async () => {
      const validateUrl = await getValidateUrl();

      expect(validateUrl(null).valid).toBe(false);
      expect(validateUrl(undefined).valid).toBe(false);
      expect(validateUrl(123).valid).toBe(false);
      expect(validateUrl({}).valid).toBe(false);
    });

    it('should handle URLs with subdomains of blocked hosts', async () => {
      const validateUrl = await getValidateUrl();

      const result = validateUrl('http://subdomain.localhost');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should require valid TLD', async () => {
      const validateUrl = await getValidateUrl();

      const result = validateUrl('http://example');
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePath() function', () => {
    const getValidatePath = async () => {
      return (await import('../../bin/validation.js')).validatePath;
    };

    it('should validate normal paths', async () => {
      const validatePath = await getValidatePath();

      const result = validatePath('/var/log/app.log');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.resolved).toBeDefined();
    });

    it('should reject paths with null bytes', async () => {
      const validatePath = await getValidatePath();

      const result = validatePath('/etc/passwd\x00.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Null bytes');
    });

    it('should reject paths with traversal characters', async () => {
      const validatePath = await getValidatePath();

      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '~/../../etc/passwd',
        './test/../file',
        '~/secret',
      ];

      traversalAttempts.forEach((pathStr) => {
        const result = validatePath(pathStr);
        expect(result.valid, `${pathStr} should be rejected`).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });

    it('should reject empty paths', async () => {
      const validatePath = await getValidatePath();

      const result = validatePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject non-string input', async () => {
      const validatePath = await getValidatePath();

      expect(validatePath(null).valid).toBe(false);
      expect(validatePath(undefined).valid).toBe(false);
      expect(validatePath(123).valid).toBe(false);
    });

    it('should validate paths against base directory', async () => {
      const validatePath = await getValidatePath();
      const path = require('path');

      // Use process.cwd() style path for cross-platform compatibility
      const baseDir = process.platform === 'win32' ? 'C:\\app' : '/app';
      const testPath = 'subdir/file.txt';

      const result = validatePath(testPath, baseDir);
      // The test should pass - no traversal characters in the path
      expect(result.valid).toBe(true);
    });

    it('should reject paths escaping base directory', async () => {
      const validatePath = await getValidatePath();

      // This should be rejected by the .. check
      const result = validatePath('../../etc/passwd', '/app');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace from paths', async () => {
      const validatePath = await getValidatePath();

      const result = validatePath('  /var/log/app.log  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDockerName() function', () => {
    const getValidateDockerName = async () => {
      return (await import('../../bin/validation.js')).validateDockerName;
    };

    it('should validate valid Docker names', async () => {
      const validateDockerName = await getValidateDockerName();

      const validNames = [
        'my-container',
        'my_container',
        'my.container',
        'Container123',
        'a',
        'test123-abc_DEF',
      ];

      validNames.forEach((name) => {
        const result = validateDockerName(name);
        expect(result.valid, `${name} should be valid`).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    it('should reject empty names', async () => {
      const validateDockerName = await getValidateDockerName();

      const result = validateDockerName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject names starting with invalid characters', async () => {
      const validateDockerName = await getValidateDockerName();

      const invalidNames = [
        '-container',
        '_container',
        '.container',
      ];

      invalidNames.forEach((name) => {
        const result = validateDockerName(name);
        expect(result.valid, `${name} should be invalid`).toBe(false);
      });
    });

    it('should reject names with dangerous characters', async () => {
      const validateDockerName = await getValidateDockerName();

      const dangerousNames = [
        'container$(rm -rf /)',
        'container`id`',
        'container; echo pwned',
        'container && malicious',
        'container | evil',
        'container$(whoami)',
        "container'; DROP TABLE--",
      ];

      dangerousNames.forEach((name) => {
        const result = validateDockerName(name);
        expect(result.valid, `${name} should be rejected`).toBe(false);
        // Error message may vary based on which check catches it first
        expect(result.error).not.toBeNull();
      });
    });

    it('should reject non-string input', async () => {
      const validateDockerName = await getValidateDockerName();

      expect(validateDockerName(null).valid).toBe(false);
      expect(validateDockerName(undefined).valid).toBe(false);
      expect(validateDockerName(123).valid).toBe(false);
    });

    it('should trim whitespace from names', async () => {
      const validateDockerName = await getValidateDockerName();

      const result = validateDockerName('  my-container  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('Module exports', () => {
    it('should export all validation functions', async () => {
      const validation = await import('../../bin/validation.js');

      expect(validation.validateUrl).toBeDefined();
      expect(validation.validatePath).toBeDefined();
      expect(validation.validateDockerName).toBeDefined();
    });
  });
});
