import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to track calls but prevent actual output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

describe('UI Output Module', () => {
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    process.exit = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;

    // Clear require cache
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('bin/ui/output.js')) {
        delete require.cache[key];
      }
    });
  });

  describe('Module exports', () => {
    it('should export all output functions', async () => {
      const output = await import('../../bin/ui/output.js');

      expect(output.printHeader).toBeDefined();
      expect(output.printSuccess).toBeDefined();
      expect(output.printError).toBeDefined();
      expect(output.printWarning).toBeDefined();
      expect(output.printStep).toBeDefined();
      expect(output.printInfo).toBeDefined();
      expect(output.fail).toBeDefined();
      expect(output.printReady).toBeDefined();
    });
  });

  describe('printHeader function', () => {
    it('should print Guardian banner', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printHeader();

      expect(console.log).toHaveBeenCalled();
      const calls = console.log.mock.calls;
      const outputText = calls.map(call => call.join(' ')).join('\n');

      expect(outputText).toContain('Guardian');
      expect(outputText).toContain('AI-Powered Security Review');
    });
  });

  describe('printSuccess function', () => {
    it('should print success message with checkmark', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printSuccess('Operation successful');

      const call = console.log.mock.calls[0][0];
      expect(call).toContain('\u001b[32m'); // Green color
      expect(call).toContain('Operation successful');
    });
  });

  describe('printError function', () => {
    it('should print error message with cross symbol and newlines', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printError('Something went wrong');

      expect(console.error).toHaveBeenCalled();
      const calls = console.error.mock.calls[0];
      expect(calls[0]).toContain('\n'); // Starts with newline
      const fullMessage = calls.join('');
      expect(fullMessage).toContain('Something went wrong');
    });
  });

  describe('printWarning function', () => {
    it('should print warning message with warning symbol', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printWarning('Be careful');

      const call = console.log.mock.calls[0][0];
      expect(call).toContain('\u001b[33m'); // Yellow color
      expect(call).toContain('Be careful');
    });
  });

  describe('printStep function', () => {
    it('should print step message with arrow', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printStep('Processing...');

      const call = console.log.mock.calls[0][0];
      expect(call).toContain('\u001b[33m'); // Yellow color
      expect(call).toContain('Processing...');
    });
  });

  describe('printInfo function', () => {
    it('should print info message dimmed', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printInfo('Information');

      const call = console.log.mock.calls[0][0];
      expect(call).toContain('\u001b[2m'); // Dim color
      expect(call).toContain('Information');
    });
  });

  describe('fail function', () => {
    it('should print error and exit with code 1', async () => {
      const output = await import('../../bin/ui/output.js');

      output.fail('Critical error');

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('printReady function', () => {
    it('should print ready message for production mode', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printReady(true);

      expect(console.log).toHaveBeenCalled();
      const outputText = console.log.mock.calls.map(call => call.join(' ')).join('\n');
      expect(outputText).toContain('Ready!');
    });

    it('should print ready message for development mode', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printReady(false);

      expect(console.log).toHaveBeenCalled();
      const outputText = console.log.mock.calls.map(call => call.join(' ')).join('\n');
      expect(outputText).toContain('Ready!');
      expect(outputText).toContain('from your project directory');
    });

    it('should include instruction to read REVIEW.md', async () => {
      const output = await import('../../bin/ui/output.js');

      output.printReady(true);

      const outputText = console.log.mock.calls.map(call => call.join(' ')).join('\n');
      expect(outputText).toContain('.guardian/REVIEW.md');
    });
  });
});
