import { InputValidator } from '../../../src/security/InputValidator';

describe('InputValidator', () => {
  describe('validateSourceCode', () => {
    it('should accept valid source code', () => {
      const result = InputValidator.validateSourceCode('#include <iostream>\nint main() { return 0; }');
      expect(result.success).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it('should reject empty source code', () => {
      const result = InputValidator.validateSourceCode('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject non-string source code', () => {
      const result = InputValidator.validateSourceCode(null as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject source code that is too large', () => {
      const largeSource = 'a'.repeat(2 * 1024 * 1024); // 2MB
      const result = InputValidator.validateSourceCode(largeSource);
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });
  });

  describe('validateLanguageStandard', () => {
    it('should accept valid C standards', () => {
      const standards = ['c89', 'c99', 'c11', 'c17', 'c23'];
      
      for (const standard of standards) {
        const result = InputValidator.validateLanguageStandard(standard);
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid C++ standards', () => {
      const standards = ['c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'];
      
      for (const standard of standards) {
        const result = InputValidator.validateLanguageStandard(standard);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid standards', () => {
      const result = InputValidator.validateLanguageStandard('c++25');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid language standard');
    });
  });

  describe('validateOptimizationLevel', () => {
    it('should accept valid optimization levels', () => {
      const levels = ['O0', 'O1', 'O2', 'O3', 'Os', 'Oz', 'Ofast'];
      
      for (const level of levels) {
        const result = InputValidator.validateOptimizationLevel(level);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid optimization levels', () => {
      const result = InputValidator.validateOptimizationLevel('O4');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid optimization level');
    });
  });

  describe('validateDefines', () => {
    it('should accept valid defines', () => {
      const defines = ['NDEBUG', 'VERSION=1', 'MAX_SIZE=100'];
      const result = InputValidator.validateDefines(defines);
      expect(result.success).toBe(true);
    });

    it('should reject invalid define formats', () => {
      const result = InputValidator.validateDefines(['123INVALID']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid define format');
    });

    it('should reject non-array input', () => {
      const result = InputValidator.validateDefines('not-an-array' as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an array');
    });
  });

  describe('validateIncludes', () => {
    it('should accept valid include paths', () => {
      const includes = ['include', 'src/headers', 'lib/external'];
      const result = InputValidator.validateIncludes(includes);
      expect(result.success).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      const result = InputValidator.validateIncludes(['../../../etc/passwd']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('traversal not allowed');
    });

    it('should reject absolute paths', () => {
      const result = InputValidator.validateIncludes(['/usr/include']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('traversal not allowed');
    });
  });

  describe('validateCompilerFlags', () => {
    it('should accept whitelisted flags', () => {
      const flags = ['-Wall', '-Wextra', '-O2', '-std=c++17'];
      const result = InputValidator.validateCompilerFlags(flags);
      expect(result.success).toBe(true);
    });

    it('should accept flags with allowed prefixes', () => {
      const flags = ['-DDEBUG=1', '-Isrc/include', '-fPIC'];
      const result = InputValidator.validateCompilerFlags(flags);
      expect(result.success).toBe(true);
    });

    it('should reject dangerous flags', () => {
      const result = InputValidator.validateCompilerFlags(['--system-call']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Disallowed compiler flag');
    });
  });

  describe('validateTimeout', () => {
    it('should accept valid timeouts', () => {
      const result = InputValidator.validateTimeout(30);
      expect(result.success).toBe(true);
    });

    it('should reject timeouts that are too short', () => {
      const result = InputValidator.validateTimeout(0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 60 seconds');
    });

    it('should reject timeouts that are too long', () => {
      const result = InputValidator.validateTimeout(120);
      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 60 seconds');
    });

    it('should reject non-number inputs', () => {
      const result = InputValidator.validateTimeout('30' as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be a number');
    });
  });
});