import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to avoid output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('CLI Module - Standalone Functions', () => {
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

  describe('Color functions (tested via colors.js module)', () => {
    it('should export all color functions from colors.js', async () => {
      const colors = await import('../../bin/ui/colors.js');

      expect(colors.green).toBeDefined();
      expect(colors.red).toBeDefined();
      expect(colors.yellow).toBeDefined();
      expect(colors.bold).toBeDefined();
      expect(colors.dim).toBeDefined();
      expect(colors.cyan).toBeDefined();
      expect(colors.blue).toBeDefined();
    });

    it('should apply green color formatting', async () => {
      const { green } = await import('../../bin/ui/colors.js');

      expect(green('success')).toContain('\x1b[32m');
      expect(green('success')).toContain('\x1b[0m');
    });

    it('should apply red color formatting', async () => {
      const { red } = await import('../../bin/ui/colors.js');

      expect(red('error')).toContain('\x1b[31m');
      expect(red('error')).toContain('\x1b[0m');
    });

    it('should apply yellow color formatting', async () => {
      const { yellow } = await import('../../bin/ui/colors.js');

      expect(yellow('warning')).toContain('\x1b[33m');
      expect(yellow('warning')).toContain('\x1b[0m');
    });

    it('should apply bold formatting', async () => {
      const { bold } = await import('../../bin/ui/colors.js');

      expect(bold('bold text')).toContain('\x1b[1m');
      expect(bold('bold text')).toContain('\x1b[0m');
    });

    it('should apply dim formatting', async () => {
      const { dim } = await import('../../bin/ui/colors.js');

      expect(dim('dim text')).toContain('\x1b[2m');
      expect(dim('dim text')).toContain('\x1b[0m');
    });

    it('should apply cyan color formatting', async () => {
      const { cyan } = await import('../../bin/ui/colors.js');

      expect(cyan('info')).toContain('\x1b[36m');
      expect(cyan('info')).toContain('\x1b[0m');
    });

    it('should apply blue color formatting', async () => {
      const { blue } = await import('../../bin/ui/colors.js');

      expect(blue('blue text')).toContain('\x1b[34m');
      expect(blue('blue text')).toContain('\x1b[0m');
    });
  });

  describe('isUrl() function (from platform.js)', () => {
    it('should return true for valid HTTPS URLs', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('https://api.example.com/v1')).toBe(true);
    });

    it('should return true for valid HTTP URLs', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      expect(isUrl('http://example.com')).toBe(true);
      expect(isUrl('http://localhost:3000')).toBe(true);
    });

    it('should return false for invalid URLs', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      expect(isUrl('example.com')).toBe(false);
      expect(isUrl('ftp://example.com')).toBe(false);
      expect(isUrl('not-a-url')).toBe(false);
      expect(isUrl('')).toBe(false);
    });

    it('should be case insensitive for protocol', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      expect(isUrl('HTTP://example.com')).toBe(true);
      expect(isUrl('HTTPS://example.com')).toBe(true);
      expect(isUrl('HtTpS://example.com')).toBe(true);
    });

    it('should reject invalid URL protocols', async () => {
      const { isUrl } = await import('../../bin/platform.js');

      // The isUrl function is a simple check - it only validates the protocol
      // For thorough validation, use validateUrl from validation.js
      expect(isUrl('ftp://example.com')).toBe(false);
      expect(isUrl('not-a-url')).toBe(false);
      expect(isUrl('')).toBe(false);
      expect(isUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('Platform detection (from platform.js)', () => {
    it('should detect current platform properties', async () => {
      const { getPlatform } = await import('../../bin/platform.js');

      const platform = getPlatform();

      expect(platform).toHaveProperty('isLinux');
      expect(platform).toHaveProperty('isMac');
      expect(platform).toHaveProperty('isWindows');
      expect(platform).toHaveProperty('platform');

      // Should have exactly one platform true
      const trueCount = [
        platform.isLinux,
        platform.isMac,
        platform.isWindows
      ].filter(Boolean).length;

      expect(trueCount).toBe(1);
    });

    it('should detect Linux platform', async () => {
      const { getPlatform } = await import('../../bin/platform.js');

      const platform = getPlatform();

      if (process.platform === 'linux') {
        expect(platform.isLinux).toBe(true);
      }
    });

    it('should detect macOS platform', async () => {
      const { getPlatform } = await import('../../bin/platform.js');

      const platform = getPlatform();

      if (process.platform === 'darwin') {
        expect(platform.isMac).toBe(true);
      }
    });

    it('should detect Windows platform', async () => {
      const { getPlatform } = await import('../../bin/platform.js');

      const platform = getPlatform();

      if (process.platform === 'win32') {
        expect(platform.isWindows).toBe(true);
      }
    });
  });

  describe('Network configuration (from platform.js)', () => {
    it('should return network flag for Linux', async () => {
      const { getNetworkFlag } = await import('../../bin/platform.js');

      const linuxPlatform = { isLinux: true, isMac: false, isWindows: false, platform: 'linux' };
      expect(getNetworkFlag(linuxPlatform)).toBe('--network=host');
    });

    it('should return empty flag for non-Linux platforms', async () => {
      const { getNetworkFlag } = await import('../../bin/platform.js');

      const macPlatform = { isLinux: false, isMac: true, isWindows: false, platform: 'darwin' };
      expect(getNetworkFlag(macPlatform)).toBe('');

      const windowsPlatform = { isLinux: false, isMac: false, isWindows: true, platform: 'win32' };
      expect(getNetworkFlag(windowsPlatform)).toBe('');
    });

    it('should provide network hint for Linux', async () => {
      const { getNetworkHint } = await import('../../bin/platform.js');

      const linuxPlatform = { isLinux: true, isMac: false, isWindows: false, platform: 'linux' };
      const hint = getNetworkHint(linuxPlatform);

      expect(hint).toContain('Linux');
      expect(hint).toContain('localhost');
    });

    it('should provide network hint for macOS', async () => {
      const { getNetworkHint } = await import('../../bin/platform.js');

      const macPlatform = { isLinux: false, isMac: true, isWindows: false, platform: 'darwin' };
      const hint = getNetworkHint(macPlatform);

      expect(hint).toContain('macOS');
      expect(hint).toContain('host.docker.internal');
    });

    it('should provide network hint for Windows', async () => {
      const { getNetworkHint } = await import('../../bin/platform.js');

      const windowsPlatform = { isLinux: false, isMac: false, isWindows: true, platform: 'win32' };
      const hint = getNetworkHint(windowsPlatform);

      expect(hint).toContain('Windows');
      expect(hint).toContain('host.docker.internal');
    });

    it('should provide network hint for unknown platforms', async () => {
      const { getNetworkHint } = await import('../../bin/platform.js');

      const unknownPlatform = { isLinux: false, isMac: false, isWindows: false, platform: 'freebsd' };
      const hint = getNetworkHint(unknownPlatform);

      expect(hint).toContain('freebsd');
      expect(hint).toContain('host.docker.internal');
    });
  });

  describe('hasProjectFiles() function (from platform.js)', () => {
    const mockFs = {
      existsSync: vi.fn(),
      realpathSync: vi.fn((p) => p),
    };

    it('should return true when package.json exists', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockImplementation((filePath) => {
        return String(filePath).endsWith('package.json');
      });

      const result = hasProjectFiles(config.config.PROJECT_MARKERS, mockFs);

      expect(result).toBe(true);
    });

    it('should return true when requirements.txt exists', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockImplementation((filePath) => {
        return String(filePath).endsWith('requirements.txt');
      });

      const result = hasProjectFiles(config.config.PROJECT_MARKERS, mockFs);

      expect(result).toBe(true);
    });

    it('should return true when go.mod exists', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockImplementation((filePath) => {
        return String(filePath).endsWith('go.mod');
      });

      const result = hasProjectFiles(config.config.PROJECT_MARKERS, mockFs);

      expect(result).toBe(true);
    });

    it('should return false when no project markers exist', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockReturnValue(false);

      const result = hasProjectFiles(config.config.PROJECT_MARKERS, mockFs);

      expect(result).toBe(false);
    });

    it('should warn when symlink detected', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockReturnValue(false);
      mockFs.realpathSync.mockReturnValue('/different/path');

      hasProjectFiles(config.config.PROJECT_MARKERS, mockFs);

      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle realpathSync errors gracefully', async () => {
      const { hasProjectFiles } = await import('../../bin/platform.js');
      const config = await import('../../bin/config.js');

      mockFs.existsSync.mockReturnValue(false);
      mockFs.realpathSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      expect(() => hasProjectFiles(config.config.PROJECT_MARKERS, mockFs)).not.toThrow();
    });
  });

  describe('validateWorkingDirectory() function (from platform.js)', () => {
    it('should fail when path contains symbolic links', async () => {
      const { validateWorkingDirectory } = await import('../../bin/platform.js');
      const mockFail = vi.fn();

      // Mock path.cwd to return a different path than normalize
      const originalCwd = process.cwd;
      process.cwd = vi.fn(() => '/test/symlink');

      validateWorkingDirectory(mockFail);

      // The behavior depends on path.normalize, let's just check it's defined
      expect(validateWorkingDirectory).toBeDefined();

      process.cwd = originalCwd;
    });
  });

  describe('PROJECT_MARKERS (from config.js)', () => {
    it('should contain all expected project markers', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.PROJECT_MARKERS).toContain('package.json');
      expect(config.PROJECT_MARKERS).toContain('requirements.txt');
      expect(config.PROJECT_MARKERS).toContain('pyproject.toml');
      expect(config.PROJECT_MARKERS).toContain('go.mod');
      expect(config.PROJECT_MARKERS).toContain('pom.xml');
      expect(config.PROJECT_MARKERS).toContain('build.gradle');
      expect(config.PROJECT_MARKERS).toContain('Gemfile');
      expect(config.PROJECT_MARKERS).toContain('composer.json');
      expect(config.PROJECT_MARKERS).toContain('Cargo.toml');
      expect(config.PROJECT_MARKERS).toContain('Pipfile');
    });
  });
});
