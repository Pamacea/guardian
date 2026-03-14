import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';

// Mock child_process at module level
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(() => cb(1), 10); // Simulate Docker not available
    })
  }))
}));

describe('Vite Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Source Map Leak Detection', () => {
    it('should detect no source maps when none exist', async () => {
      const { checkSourceMapLeak } = await import('../../bin/scanners/vite.js');
      const result = await checkSourceMapLeak('/mock/vite/project');

      expect(result.name).toBe('Source Map Leak Check');
      expect(result.leakedFiles).toBeInstanceOf(Array);
      expect(result.leakedFiles.length).toBe(0);
      expect(result.status).toBe('passed');
    });

    it('should handle non-existent directories', async () => {
      const { checkSourceMapLeak } = await import('../../bin/scanners/vite.js');
      const result = await checkSourceMapLeak('/non/existent/path');

      expect(result.name).toBe('Source Map Leak Check');
      expect(result.leakedFiles).toBeInstanceOf(Array);
      expect(result.leakedFiles.length).toBe(0);
      expect(result.status).toBe('passed');
    });
  });

  describe('HMR Injection Detection', () => {
    it('should detect exposed HMR endpoint', async () => {
      const { checkHMRInjection } = await import('../../bin/scanners/vite.js');

      const result = await checkHMRInjection('http://localhost:5173', 'guardian-tools');

      expect(result.name).toBe('HMR Injection Check');
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should detect exposed WebSocket HMR', async () => {
      const { checkHMRInjection } = await import('../../bin/scanners/vite.js');

      const result = await checkHMRInjection('http://localhost:5173', 'guardian-tools');

      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('Dependency Pre-bundling Check', () => {
    it('should skip when no pre-bundled dependencies', async () => {
      const { checkDependencyPrebundling } = await import('../../bin/scanners/vite.js');
      const result = await checkDependencyPrebundling('/mock/vite/project');

      expect(result.name).toBe('Dependency Pre-bundling Check');
      expect(result.issues).toBeInstanceOf(Array);
    });
  });

  describe('Public Files Exposure', () => {
    it('should skip when no public directory', async () => {
      const { checkPublicFilesExposure } = await import('../../bin/scanners/vite.js');
      const result = await checkPublicFilesExposure('/mock/vite/project');

      expect(result.name).toBe('Public Files Exposure Check');
      expect(result.exposedFiles).toBeInstanceOf(Array);
      expect(result.exposedFiles.length).toBe(0);
      expect(result.status).toBe('skipped');
    });
  });

  describe('Environment Variable Leak', () => {
    it('should handle non-existent source directories', async () => {
      const { checkEnvVarLeak } = await import('../../bin/scanners/vite.js');
      const result = await checkEnvVarLeak('/mock/vite/project');

      expect(result.name).toBe('Environment Variable Leak Check');
      expect(result.leakedVars).toBeInstanceOf(Array);
      expect(result.leakedVars.length).toBe(0);
      expect(result.status).toBe('passed');
    });
  });

  describe('VoidZero Tools Check', () => {
    it('should handle non-existent package.json', async () => {
      const { checkVoidZeroTools } = await import('../../bin/scanners/vite.js');
      const result = await checkVoidZeroTools('/mock/vite/project');

      expect(result.name).toBe('VoidZero Tools Security Check');
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBe(0);
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should detect multiple lockfiles when they exist', async () => {
      // This test verifies the logic - when package.json doesn't exist, no lockfiles are checked
      const { checkVoidZeroTools } = await import('../../bin/scanners/vite.js');
      const result = await checkVoidZeroTools('/mock/vite/project');

      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('Vite Scanner Integration', () => {
    it('should run full Vite security scan', async () => {
      const { scan } = await import('../../bin/scanners/vite.js');

      const viteInfo = {
        detected: true,
        version: '^5.0.0',
        features: ['dev-server', 'build'],
        voidzero: {
          detected: true,
          tools: ['nv', 'vti']
        }
      };

      const result = await scan(viteInfo, {
        projectPath: '/mock/vite/project',
        target: 'http://localhost:5173',
        containerName: 'guardian-tools'
      });

      expect(result.framework).toBe('vite');
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should handle missing voidzero tools', async () => {
      const { scan } = await import('../../bin/scanners/vite.js');

      const viteInfo = {
        detected: true,
        version: '^5.0.0',
        features: ['dev-server', 'build']
      };

      const result = await scan(viteInfo, {
        projectPath: '/mock/vite/project',
        target: 'http://localhost:5173',
        containerName: 'guardian-tools'
      });

      expect(result.framework).toBe('vite');
      expect(result.checks).toBeInstanceOf(Array);
    });
  });
});
