import { CompilationTool } from '../../../src/tools/CompilationTool';
import type { CompilationOptions } from '../../../src/types';

// Mock DockerManager
jest.mock('../../../src/docker/DockerManager', () => ({
  DockerManager: jest.fn().mockImplementation(() => ({
    executeInContainer: jest.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: '',
      executionTime: 1000,
    }),
  })),
}));

describe('CompilationTool', () => {
  let compilationTool: CompilationTool;

  beforeEach(() => {
    compilationTool = new CompilationTool();
  });

  describe('compile', () => {
    const validOptions: CompilationOptions = {
      sourceCode: '#include <iostream>\nint main() { std::cout << "Hello"; return 0; }',
      language: 'c++17',
      optimization: 'O0',
      warnings: 'all',
    };

    it('should validate source code', async () => {
      const result = await compilationTool.compile({
        sourceCode: '',
        language: 'c++17',
      });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('empty'),
        },
      });
    });

    it('should validate language standard', async () => {
      const result = await compilationTool.compile({
        sourceCode: 'int main() {}',
        language: 'invalid-standard' as any,
      });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid language standard'),
        },
      });
    });

    it('should compile successfully with valid options', async () => {
      const result = await compilationTool.compile(validOptions);

      expect('success' in result).toBe(true);
      if ('success' in result && result.success) {
        expect(result.exitCode).toBe(0);
        expect(result.compilationTime).toBeGreaterThan(0);
        expect(result.clangVersion).toBeDefined();
        expect(result.diagnostics).toBeDefined();
      }
    });

    it('should handle compilation timeout', async () => {
      const result = await compilationTool.compile({
        ...validOptions,
        timeout: 0.1, // Very short timeout
      });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Timeout must be between 1 and 60'),
        },
      });
    });

    it('should validate compiler flags', async () => {
      const result = await compilationTool.compile({
        ...validOptions,
        flags: ['--dangerous-flag'],
      });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Disallowed compiler flag'),
        },
      });
    });
  });
});