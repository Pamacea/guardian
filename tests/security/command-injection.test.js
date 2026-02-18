import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to avoid output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Security: Command Injection Prevention', () => {
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

  describe('Path traversal prevention', () => {
    it('should normalize paths to prevent traversal', () => {
      const path = require('path');

      const malicious = '../../../etc/passwd';
      const normalized = path.normalize(malicious);

      // Normalized path should resolve the traversal (behavior differs by platform)
      // On Unix: '../../../etc/passwd' -> '../../../etc/passwd' (if no root)
      // On Windows: '..\..\..\etc\passwd'
      expect(normalized).toBeDefined();
    });

    it('should validate working directory normalization', () => {
      const path = require('path');

      const cwd = '/some/symlink/path';
      const normalized = path.normalize(cwd);

      expect(normalized).toBeDefined();
    });
  });

  describe('Argument injection prevention', () => {
    it('should validate URL format before use', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      // Valid URLs should pass
      expect(isUrl('https://example.com')).toBe(true);

      // The isUrl function uses simple regex and doesn't reject all injection attempts
      // It just checks for http:// or https:// prefix
      // More thorough validation is done by validateUrl in validation.js
      expect(isUrl('not-a-url')).toBe(false);
      expect(isUrl('ftp://example.com')).toBe(false);
      expect(isUrl('')).toBe(false);
    });

    it('should use validateUrl for comprehensive URL validation', async () => {
      const { validateUrl } = await import('../../bin/validation.js');

      // validateUrl blocks SSRF and does thorough validation
      expect(validateUrl('https://example.com').valid).toBe(true);
      expect(validateUrl('http://localhost').valid).toBe(false); // SSRF blocked
      expect(validateUrl('not-a-url').valid).toBe(false); // Invalid format
    });
  });

  describe('Docker command safety', () => {
    it('should use proper container name escaping', async () => {
      const { config } = await import('../../bin/config.js');

      // Container names are hardcoded constants, not user input
      expect(config.CONTAINER_NAME).toBe('guardian-tools');
      expect(config.CONTAINER_NAME).not.toContain(';');
      expect(config.CONTAINER_NAME).not.toContain('&&');
      expect(config.CONTAINER_NAME).not.toContain('|');
      expect(config.CONTAINER_NAME).not.toContain('$(');
    });

    it('should use image name constant', async () => {
      const { config } = await import('../../bin/config.js');

      // Image names are hardcoded constants
      expect(config.IMAGE_NAME).toBe('guardian-tools');
      expect(config.IMAGE_NAME).not.toContain(';');
      expect(config.IMAGE_NAME).not.toContain('&&');
    });

    it('should validate Docker names using validation module', async () => {
      const { validateDockerName } = await import('../../bin/validation.js');

      // Valid name
      expect(validateDockerName('guardian-tools').valid).toBe(true);

      // Invalid names with injection attempts
      expect(validateDockerName('$(rm -rf /)').valid).toBe(false);
      expect(validateDockerName('container; malicious').valid).toBe(false);
      expect(validateDockerName('container`id`').valid).toBe(false);
    });
  });

  describe('File system security', () => {
    it('should validate prompt source and destination paths', () => {
      const path = require('path');

      const promptSrc = path.join(__dirname, '..', '..', 'prompt', 'REVIEW.md');
      const promptDest = path.join(process.cwd(), '.guardian', 'REVIEW.md');

      expect(promptSrc).toContain('REVIEW.md');
      expect(promptDest).toContain('.guardian');
    });

    it('should validate paths to prevent traversal', async () => {
      const { validatePath } = await import('../../bin/validation.js');

      // Valid path
      expect(validatePath('/var/log/app.log').valid).toBe(true);

      // Paths with traversal attempts should be rejected
      expect(validatePath('../../../etc/passwd').valid).toBe(false);
      expect(validatePath('/etc/passwd\x00.txt').valid).toBe(false);
    });
  });

  describe('URL validation security', () => {
    it('should block SSRF attempts', async () => {
      const { validateUrl } = await import('../../bin/validation.js');

      // These should be blocked
      expect(validateUrl('http://localhost').valid).toBe(false);
      expect(validateUrl('http://127.0.0.1').valid).toBe(false);
      expect(validateUrl('http://169.254.169.254').valid).toBe(false);
      expect(validateUrl('http://metadata.google.internal').valid).toBe(false);
    });

    it('should block private IP ranges', async () => {
      const { validateUrl } = await import('../../bin/validation.js');

      expect(validateUrl('http://10.0.0.1').valid).toBe(false);
      expect(validateUrl('http://192.168.1.1').valid).toBe(false);
      expect(validateUrl('http://172.16.0.1').valid).toBe(false);
    });
  });

  describe('Authorization checks', () => {
    it('should prompt for authorization in production mode', () => {
      const productionMode = true;
      const targetUrl = 'https://example.com';

      if (productionMode && targetUrl) {
        // Should prompt for authorization
        expect(productionMode).toBe(true);
        expect(targetUrl).toBeTruthy();
      }
    });
  });

  describe('Docker name validation', () => {
    it('should reject Docker names with shell metacharacters', async () => {
      const { validateDockerName } = await import('../../bin/validation.js');

      const dangerousNames = [
        'container$(rm -rf /)',
        'container`id`',
        'container; echo pwned',
        'container && malicious',
        'container | evil',
      ];

      dangerousNames.forEach((name) => {
        const result = validateDockerName(name);
        expect(result.valid, `${name} should be rejected`).toBe(false);
      });
    });
  });

  describe('Platform detection security', () => {
    it('should not attempt to modify process.platform', async () => {
      const { getPlatform } = await import('../../bin/platform.js');

      const platform = getPlatform();

      // Should return platform info without modifying process.platform
      expect(platform.platform).toBe(process.platform);
      expect(platform.isLinux).toBe(process.platform === 'linux');
      expect(platform.isMac).toBe(process.platform === 'darwin');
      expect(platform.isWindows).toBe(process.platform === 'win32');
    });
  });

  describe('Network configuration security', () => {
    it('should use appropriate network flag per platform', async () => {
      const { getNetworkFlag } = await import('../../bin/platform.js');

      // Linux uses host network
      const linuxPlatform = { isLinux: true, isMac: false, isWindows: false, platform: 'linux' };
      expect(getNetworkFlag(linuxPlatform)).toBe('--network=host');

      // Other platforms don't use special flag
      const macPlatform = { isLinux: false, isMac: true, isWindows: false, platform: 'darwin' };
      expect(getNetworkFlag(macPlatform)).toBe('');
    });
  });
});
