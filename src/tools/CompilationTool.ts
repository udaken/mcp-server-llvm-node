import { DockerManager, type DockerOptions } from '../docker/DockerManager.js';
import { InputValidator, type ValidationResult } from '../security/InputValidator.js';
import { OutputSanitizer } from '../security/OutputSanitizer.js';
import { logger } from '../utils/logger.js';
import type { 
  CompilationOptions, 
  CompilationResponse, 
  DiagnosticMessage, 
  CompilationDiagnostics,
  ErrorResponse 
} from '../types/index.js';

export class CompilationTool {
  private dockerManager: DockerManager;

  constructor() {
    this.dockerManager = new DockerManager();
  }

  async compile(options: CompilationOptions): Promise<CompilationResponse | ErrorResponse> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const validationResult = this.validateInputs(options);
      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error!,
          },
        };
      }

      // Build compiler command
      const compilerCommand = this.buildCompilerCommand(options);
      logger.debug('Executing compilation', { command: compilerCommand });

      // Execute compilation in Docker container
      const dockerOptions: DockerOptions = {
        sourceCode: options.sourceCode,
        command: compilerCommand,
        timeout: (options.timeout || 30) * 1000, // Convert to milliseconds
        workingDir: '/workspace',
      };

      const result = await this.dockerManager.executeInContainer(dockerOptions);
      
      // Sanitize outputs
      const sanitizedStdout = OutputSanitizer.sanitizeStdout(result.stdout);
      const sanitizedStderr = OutputSanitizer.sanitizeStderr(result.stderr);

      // Parse diagnostics from compiler output
      const diagnostics = this.parseDiagnostics(sanitizedStderr);

      // Get Clang version (if available in stdout)
      const clangVersion = this.extractClangVersion(result.stdout, result.stderr);

      const response: CompilationResponse = {
        success: result.success,
        exitCode: result.exitCode,
        stdout: sanitizedStdout,
        stderr: sanitizedStderr,
        diagnostics,
        compilationTime: (Date.now() - startTime) / 1000, // Convert to seconds
        clangVersion,
      };

      logger.info('Compilation completed', { 
        success: result.success, 
        exitCode: result.exitCode,
        compilationTime: response.compilationTime,
        errorCount: diagnostics.errors.length,
        warningCount: diagnostics.warnings.length,
      });

      return response;

    } catch (error) {
      logger.error('Compilation failed', { error: error instanceof Error ? error.message : error });
      
      return {
        success: false,
        error: {
          code: 'COMPILATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          details: { executionTime: (Date.now() - startTime) / 1000 },
        },
      };
    }
  }

  private validateInputs(options: CompilationOptions): ValidationResult {
    // Validate source code
    let result = InputValidator.validateSourceCode(options.sourceCode);
    if (!result.success) return result;

    // Validate language standard
    if (options.language) {
      result = InputValidator.validateLanguageStandard(options.language);
      if (!result.success) return result;
    }

    // Validate optimization level
    if (options.optimization) {
      result = InputValidator.validateOptimizationLevel(options.optimization);
      if (!result.success) return result;
    }

    // Validate warning level
    if (options.warnings) {
      result = InputValidator.validateWarningLevel(options.warnings);
      if (!result.success) return result;
    }

    // Validate defines
    if (options.defines) {
      result = InputValidator.validateDefines(options.defines);
      if (!result.success) return result;
    }

    // Validate includes
    if (options.includes) {
      result = InputValidator.validateIncludes(options.includes);
      if (!result.success) return result;
    }

    // Validate compiler flags
    if (options.flags) {
      result = InputValidator.validateCompilerFlags(options.flags);
      if (!result.success) return result;
    }

    // Validate timeout
    if (options.timeout) {
      result = InputValidator.validateTimeout(options.timeout);
      if (!result.success) return result;
    }

    return { success: true };
  }

  private buildCompilerCommand(options: CompilationOptions): string[] {
    const command = ['clang++'];

    // Language standard
    if (options.language) {
      command.push(`-std=${options.language}`);
    }

    // Optimization level
    if (options.optimization) {
      command.push(`-${options.optimization}`);
    }

    // Warning level
    if (options.warnings) {
      switch (options.warnings) {
        case 'none':
          command.push('-w');
          break;
        case 'all':
          command.push('-Wall');
          break;
        case 'extra':
          command.push('-Wall', '-Wextra');
          break;
        case 'pedantic':
          command.push('-Wall', '-Wextra', '-Wpedantic');
          break;
        case 'error':
          command.push('-Wall', '-Wextra', '-Werror');
          break;
      }
    }

    // Preprocessor definitions
    if (options.defines) {
      for (const define of options.defines) {
        command.push(`-D${define}`);
      }
    }

    // Include paths
    if (options.includes) {
      for (const include of options.includes) {
        command.push(`-I${include}`);
      }
    }

    // Additional compiler flags
    if (options.flags) {
      command.push(...options.flags);
    }

    // Compilation mode
    if (options.compileOnly) {
      command.push('-c');
    }

    // Output specification
    if (options.compileOnly) {
      command.push('-o', 'main.o');
    } else {
      command.push('-o', 'main');
    }

    // Source file (always last)
    command.push('main.cpp');

    return command;
  }

  private parseDiagnostics(stderr: string): CompilationDiagnostics {
    const diagnostics: CompilationDiagnostics = {
      errors: [],
      warnings: [],
      notes: [],
    };

    if (!stderr) {
      return diagnostics;
    }

    const lines = stderr.split('\n');
    
    for (const line of lines) {
      const diagnostic = this.parseDiagnosticLine(line);
      if (diagnostic) {
        switch (diagnostic.severity) {
          case 'error':
            diagnostics.errors.push(diagnostic);
            break;
          case 'warning':
            diagnostics.warnings.push(diagnostic);
            break;
          case 'note':
            diagnostics.notes.push(diagnostic);
            break;
        }
      }
    }

    return diagnostics;
  }

  private parseDiagnosticLine(line: string): DiagnosticMessage | null {
    // Clang diagnostic format: filename:line:column: severity: message
    const clangPattern = /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/;
    const match = line.match(clangPattern);

    if (match) {
      const [, , lineNum, columnNum, severity, message] = match;
      return {
        line: parseInt(lineNum, 10),
        column: parseInt(columnNum, 10),
        message: message.trim(),
        severity: severity as 'error' | 'warning' | 'note',
      };
    }

    // Alternative format without column
    const simplePattern = /^(.+?):(\d+):\s*(error|warning|note):\s*(.+)$/;
    const simpleMatch = line.match(simplePattern);

    if (simpleMatch) {
      const [, , lineNum, severity, message] = simpleMatch;
      return {
        line: parseInt(lineNum, 10),
        column: 0,
        message: message.trim(),
        severity: severity as 'error' | 'warning' | 'note',
      };
    }

    return null;
  }

  private extractClangVersion(stdout: string, stderr: string): string {
    const combinedOutput = `${stdout}\n${stderr}`;
    
    // Look for clang version in output
    const versionMatch = combinedOutput.match(/clang version ([0-9]+\.[0-9]+\.[0-9]+)/);
    if (versionMatch) {
      return `clang version ${versionMatch[1]}`;
    }

    // Fallback to generic version
    return 'clang (version unknown)';
  }
}