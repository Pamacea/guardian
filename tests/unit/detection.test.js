import { describe, it, expect, vi } from 'vitest';

describe('Detection Module', () => {
  const mockProjectPath = '/mock/project';

  describe('NestJS Detection', () => {
    it('should detect NestJS via nest-cli.json', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => path.includes('nest-cli.json')),
        readFileSync: vi.fn(() => '{}')
      };

      const { detectNestJS } = await import('../../bin/detection/nestjs.js');
      const result = await detectNestJS(mockProjectPath, mockFs);
      expect(result.detected).toBe(true);
      expect(result.framework).toBe('nestjs');
    });

    it('should detect NestJS via package.json', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => path.includes('package.json')),
        readFileSync: vi.fn(() => JSON.stringify({
          dependencies: { '@nestjs/core': '^10.0.0' }
        }))
      };

      const { detectNestJS } = await import('../../bin/detection/nestjs.js');
      const result = await detectNestJS(mockProjectPath, mockFs);
      expect(result.detected).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should detect GraphQL feature', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({
          dependencies: { '@nestjs/core': '^10.0.0', '@nestjs/graphql': '^10.0.0' }
        }))
      };

      const { detectNestJS } = await import('../../bin/detection/nestjs.js');
      const result = await detectNestJS(mockProjectPath, mockFs);
      expect(result.features).toContain('graphql');
    });

    it('should detect Throttler feature', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({
          dependencies: { '@nestjs/core': '^10.0.0', '@nestjs/throttler': '^5.0.0' }
        }))
      };

      const { detectNestJS } = await import('../../bin/detection/nestjs.js');
      const result = await detectNestJS(mockProjectPath, mockFs);
      expect(result.features).toContain('throttler');
    });
  });

  describe('Rust Detection', () => {
    it('should detect Rust via Cargo.toml', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => path.includes('Cargo.toml')),
        readFileSync: vi.fn(() => '[package]\nname = "test"\nedition = "2021"')
      };

      const { detectRust } = await import('../../bin/detection/rust.js');
      const result = await detectRust(mockProjectPath, mockFs);
      expect(result.detected).toBe(true);
      expect(result.language).toBe('rust');
    });

    it('should detect actix-web framework', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => '[dependencies]\nactix-web = "4.0"')
      };

      const { detectRust } = await import('../../bin/detection/rust.js');
      const result = await detectRust(mockProjectPath, mockFs);
      expect(result.framework).toBe('actix-web');
    });

    it('should detect axum framework', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => '[dependencies]\naxum = "0.7"')
      };

      const { detectRust } = await import('../../bin/detection/rust.js');
      const result = await detectRust(mockProjectPath, mockFs);
      expect(result.framework).toBe('axum');
    });

    it('should detect tokio runtime', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => '[dependencies]\ntokio = { version = "1.0" }')
      };

      const { detectRust } = await import('../../bin/detection/rust.js');
      const result = await detectRust(mockProjectPath, mockFs);
      expect(result.runtime).toBe('tokio');
    });
  });

  describe('Vite Detection', () => {
    it('should detect Vite via vite.config.js', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => path.includes('vite.config')),
        readFileSync: vi.fn(() => 'export default {}')
      };

      const { detectVite } = await import('../../bin/detection/vite.js');
      const result = await detectVite(mockProjectPath, mockFs);
      expect(result.detected).toBe(true);
      expect(result.framework).toBe('vite');
    });

    it('should detect Vite via package.json', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => path.includes('package.json')),
        readFileSync: vi.fn(() => JSON.stringify({
          devDependencies: { vite: '^5.0.0' }
        }))
      };

      const { detectVite } = await import('../../bin/detection/vite.js');
      const result = await detectVite(mockProjectPath, mockFs);
      expect(result.detected).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should detect React plugin', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({
          devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' }
        }))
      };

      const { detectVite } = await import('../../bin/detection/vite.js');
      const result = await detectVite(mockProjectPath, mockFs);
      expect(result.plugins).toContain('@vitejs/plugin-react');
    });

    it('should detect VoidZero tools', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => {
          return path.includes('package.json') || path.includes('pnpm-lock.yaml');
        }),
        readFileSync: vi.fn((path) => {
          if (path.includes('package.json')) {
            return JSON.stringify({
              devDependencies: { nv: '^0.1.0' }
            });
          }
          return '';
        })
      };

      const { detectVite } = await import('../../bin/detection/vite.js');
      const result = await detectVite(mockProjectPath, mockFs);
      expect(result.voidzero.detected).toBe(true);
      expect(result.voidzero.tools).toContain('nv');
    });

    it('should detect package manager', async () => {
      const mockFs = {
        existsSync: vi.fn((path) => {
          return path.includes('package.json') || path.includes('pnpm-lock.yaml');
        }),
        readFileSync: vi.fn(() => JSON.stringify({}))
      };

      const { detectVite } = await import('../../bin/detection/vite.js');
      const result = await detectVite(mockProjectPath, mockFs);
      expect(result.voidzero.packageManager).toBe('pnpm');
    });
  });

  describe('Detection Orchestrator', () => {
    it('should aggregate all detections', async () => {
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({
          dependencies: { '@nestjs/core': '^10.0.0', vite: '^5.0.0' }
        }))
      };

      const { detectProject } = await import('../../bin/detection/index.js');
      const result = await detectProject(mockProjectPath, mockFs);
      expect(result.frameworks).toBeInstanceOf(Array);
      expect(result.languages).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });
  });
});
