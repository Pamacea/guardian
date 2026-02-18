import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to avoid output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalProcessExit = process.exit;

describe('Config Module', () => {
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

  describe('Configuration exports', () => {
    it('should export config object', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have IMAGE_NAME constant', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.IMAGE_NAME).toBe('guardian-tools');
    });

    it('should have CONTAINER_NAME constant', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.CONTAINER_NAME).toBe('guardian-tools');
    });

    it('should have PROJECT_MARKERS array', async () => {
      const { config } = await import('../../bin/config.js');

      expect(Array.isArray(config.PROJECT_MARKERS)).toBe(true);
      expect(config.PROJECT_MARKERS).toContain('package.json');
    });
  });

  describe('Getter properties', () => {
    it('should return PROMPT_SRC path', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.PROMPT_SRC).toBeDefined();
      expect(config.PROMPT_SRC).toContain('prompt');
      expect(config.PROMPT_SRC).toContain('REVIEW.md');
    });

    it('should return PROMPT_DEST path', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.PROMPT_DEST).toBeDefined();
      expect(config.PROMPT_DEST).toContain('.guardian');
      expect(config.PROMPT_DEST).toContain('REVIEW.md');
    });

    it('should return DOCKERFILE path', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.DOCKERFILE).toBeDefined();
      expect(config.DOCKERFILE).toContain('docker');
      expect(config.DOCKERFILE).toContain('Dockerfile');
    });

    it('should return DOCKERFILE_DIR path', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.DOCKERFILE_DIR).toBeDefined();
      expect(config.DOCKERFILE_DIR).toContain('docker');
    });

    it('should return GUARDIAN_DIR path', async () => {
      const { config } = await import('../../bin/config.js');

      expect(config.GUARDIAN_DIR).toBeDefined();
      expect(config.GUARDIAN_DIR).toContain('.guardian');
    });
  });
});
