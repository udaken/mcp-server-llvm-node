import { z } from 'zod';
import type { LanguageStandard, OptimizationLevel, WarningLevel } from '../types/index.js';

export interface ValidationResult {
  success: boolean;
  error?: string;
  sanitized?: unknown;
}

export class InputValidator {
  private static readonly MAX_SOURCE_SIZE = 1024 * 1024; // 1MB
  private static readonly ALLOWED_FLAGS = new Set([
    '-Wall', '-Wextra', '-Wpedantic', '-Werror',
    '-g', '-O0', '-O1', '-O2', '-O3', '-Os', '-Oz', '-Ofast',
    '-std=c89', '-std=c99', '-std=c11', '-std=c17', '-std=c23',
    '-std=c++98', '-std=c++03', '-std=c++11', '-std=c++14', 
    '-std=c++17', '-std=c++20', '-std=c++23',
    '-fno-exceptions', '-fno-rtti', '-fPIC', '-march=native',
    '-mtune=native', '-ffast-math', '-fno-strict-aliasing',
    '-pthread', '-fopenmp'
  ]);

  private static readonly ALLOWED_FLAG_PREFIXES = [
    '-D', '-I', '-L', '-l', '-W', '-f', '-m'
  ];

  static validateSourceCode(source: string): ValidationResult {
    if (typeof source !== 'string') {
      return { success: false, error: 'Source code must be a string' };
    }

    if (source.length === 0) {
      return { success: false, error: 'Source code cannot be empty' };
    }

    if (source.length > this.MAX_SOURCE_SIZE) {
      return { 
        success: false, 
        error: `Source code exceeds maximum size of ${this.MAX_SOURCE_SIZE} bytes` 
      };
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /#include\s*<\s*sys\/.*>/i,     // System includes that might be dangerous
      /#include\s*<\s*unistd\.h\s*>/i, // Process control
      /system\s*\(/i,                 // System calls
      /exec\s*[lv]\s*\(/i,           // Process execution
      /fork\s*\(/i,                  // Process forking
      /__asm__/i,                    // Inline assembly
      /asm\s+volatile/i,             // Volatile assembly
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(source)) {
        console.warn('Potentially dangerous code pattern detected');
        // Don't block, but log for monitoring
        break;
      }
    }

    return { success: true, sanitized: source };
  }

  static validateLanguageStandard(language: string): ValidationResult {
    const validStandards: LanguageStandard[] = [
      'c89', 'c99', 'c11', 'c17', 'c23',
      'c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'
    ];

    if (!validStandards.includes(language as LanguageStandard)) {
      return { 
        success: false, 
        error: `Invalid language standard. Must be one of: ${validStandards.join(', ')}` 
      };
    }

    return { success: true, sanitized: language };
  }

  static validateOptimizationLevel(optimization: string): ValidationResult {
    const validLevels: OptimizationLevel[] = ['O0', 'O1', 'O2', 'O3', 'Os', 'Oz', 'Ofast'];

    if (!validLevels.includes(optimization as OptimizationLevel)) {
      return { 
        success: false, 
        error: `Invalid optimization level. Must be one of: ${validLevels.join(', ')}` 
      };
    }

    return { success: true, sanitized: optimization };
  }

  static validateWarningLevel(warnings: string): ValidationResult {
    const validLevels: WarningLevel[] = ['none', 'all', 'extra', 'pedantic', 'error'];

    if (!validLevels.includes(warnings as WarningLevel)) {
      return { 
        success: false, 
        error: `Invalid warning level. Must be one of: ${validLevels.join(', ')}` 
      };
    }

    return { success: true, sanitized: warnings };
  }

  static validateDefines(defines: string[]): ValidationResult {
    if (!Array.isArray(defines)) {
      return { success: false, error: 'Defines must be an array' };
    }

    const sanitized = [];
    for (const define of defines) {
      if (typeof define !== 'string') {
        return { success: false, error: 'All defines must be strings' };
      }

      // Validate define format: MACRO or MACRO=value
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:=[A-Za-z0-9_"'.-]*)?$/.test(define)) {
        return { 
          success: false, 
          error: `Invalid define format: ${define}. Must be MACRO or MACRO=value` 
        };
      }

      sanitized.push(define);
    }

    return { success: true, sanitized };
  }

  static validateIncludes(includes: string[]): ValidationResult {
    if (!Array.isArray(includes)) {
      return { success: false, error: 'Includes must be an array' };
    }

    const sanitized = [];
    for (const include of includes) {
      if (typeof include !== 'string') {
        return { success: false, error: 'All includes must be strings' };
      }

      // Validate include path - prevent directory traversal
      if (include.includes('..') || include.includes('~') || include.startsWith('/')) {
        return { 
          success: false, 
          error: `Invalid include path: ${include}. Relative paths and traversal not allowed` 
        };
      }

      // Only allow alphanumeric, underscore, dash, and slash
      if (!/^[A-Za-z0-9_/-]+$/.test(include)) {
        return { 
          success: false, 
          error: `Invalid include path format: ${include}` 
        };
      }

      sanitized.push(include);
    }

    return { success: true, sanitized };
  }

  static validateCompilerFlags(flags: string[]): ValidationResult {
    if (!Array.isArray(flags)) {
      return { success: false, error: 'Flags must be an array' };
    }

    const sanitized = [];
    for (const flag of flags) {
      if (typeof flag !== 'string') {
        return { success: false, error: 'All flags must be strings' };
      }

      // Check if flag is in allowed list
      if (this.ALLOWED_FLAGS.has(flag)) {
        sanitized.push(flag);
        continue;
      }

      // Check if flag starts with allowed prefix
      const hasAllowedPrefix = this.ALLOWED_FLAG_PREFIXES.some(prefix => 
        flag.startsWith(prefix)
      );

      if (hasAllowedPrefix) {
        // Additional validation for specific prefixes
        if (flag.startsWith('-D')) {
          // Validate define flags
          const define = flag.substring(2);
          const defineResult = this.validateDefines([define]);
          if (!defineResult.success) {
            return { success: false, error: `Invalid define flag: ${flag}` };
          }
        } else if (flag.startsWith('-I')) {
          // Validate include flags
          const include = flag.substring(2);
          if (include) {
            const includeResult = this.validateIncludes([include]);
            if (!includeResult.success) {
              return { success: false, error: `Invalid include flag: ${flag}` };
            }
          }
        }

        sanitized.push(flag);
      } else {
        return { 
          success: false, 
          error: `Disallowed compiler flag: ${flag}` 
        };
      }
    }

    return { success: true, sanitized };
  }

  static validateTimeout(timeout: number): ValidationResult {
    if (typeof timeout !== 'number') {
      return { success: false, error: 'Timeout must be a number' };
    }

    if (timeout < 1 || timeout > 60) {
      return { 
        success: false, 
        error: 'Timeout must be between 1 and 60 seconds' 
      };
    }

    return { success: true, sanitized: timeout };
  }

  static validateCheckers(checkers: string[]): ValidationResult {
    if (!Array.isArray(checkers)) {
      return { success: false, error: 'Checkers must be an array' };
    }

    const validCheckers = [
      'core.CallAndMessage',
      'core.DivideZero',
      'core.NonNullParamChecker',
      'core.NullDereference',
      'core.StackAddressEscape',
      'core.UndefinedBinaryOperatorResult',
      'core.VLASize',
      'core.uninitialized.ArraySubscript',
      'core.uninitialized.Assign',
      'core.uninitialized.Branch',
      'core.uninitialized.CapturedBlockVariable',
      'core.uninitialized.UndefReturn',
      'deadcode.DeadStores',
      'security.insecureAPI.UncheckedReturn',
      'security.insecureAPI.getpw',
      'security.insecureAPI.gets',
      'security.insecureAPI.mkstemp',
      'security.insecureAPI.mktemp',
      'security.insecureAPI.rand',
      'security.insecureAPI.strcpy',
      'unix.API',
      'unix.Malloc',
      'unix.MallocSizeof',
      'unix.MismatchedDeallocator',
      'unix.cstring.BadSizeArg',
      'unix.cstring.NullArg'
    ];

    const sanitized = [];
    for (const checker of checkers) {
      if (typeof checker !== 'string') {
        return { success: false, error: 'All checkers must be strings' };
      }

      if (!validCheckers.includes(checker)) {
        return { 
          success: false, 
          error: `Invalid checker: ${checker}. Must be one of: ${validCheckers.join(', ')}` 
        };
      }

      sanitized.push(checker);
    }

    return { success: true, sanitized };
  }
}