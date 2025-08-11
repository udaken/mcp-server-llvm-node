import { InputValidator, type ValidationResult } from '../security/InputValidator.js';
import { OutputSanitizer } from '../security/OutputSanitizer.js';
import { logger } from '../utils/logger.js';
import type { 
  StaticAnalysisOptions, 
  StaticAnalysisResponse, 
  AnalysisResult,
  ErrorResponse 
} from '../types/index.js';
import { BaseClangTool } from './BaseClangTool.js';

export class StaticAnalysisTool extends BaseClangTool {
  constructor() {
    super();
  }

  async analyze(options: StaticAnalysisOptions): Promise<StaticAnalysisResponse | ErrorResponse> {
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

      // Execute analysis with automatic cleanup
      const result = await this.executeWithCleanup(
        options.sourceCode,
        options.language || 'c++17',
        async (workDir, sourceFile) => {
          const analyzerCommand = this.buildAnalyzerCommand(options, sourceFile, workDir);
          logger.debug('Executing static analysis', { command: analyzerCommand });
          return await this.executeClang(analyzerCommand, 60, 'Static analysis timed out');
        }
      );

      // Parse analysis results
      const analysisResults = this.parseAnalysisResults(result.stdout, result.stderr);

      const response: StaticAnalysisResponse = {
        success: true,
        analysisResults,
        analysisTime: (Date.now() - startTime) / 1000,
      };

      logger.info('Static analysis completed', { 
        analysisTime: response.analysisTime,
        resultCount: analysisResults.length,
      });

      return response;

    } catch (error) {
      logger.error('Static analysis failed', { error: error instanceof Error ? error.message : error });
      
      return {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown analysis error',
          details: { executionTime: (Date.now() - startTime) / 1000 },
        },
      };
    }
  }

  private validateInputs(options: StaticAnalysisOptions): ValidationResult {
    // Validate source code
    let result = InputValidator.validateSourceCode(options.sourceCode);
    if (!result.success) return result;

    // Validate language standard
    if (options.language) {
      result = InputValidator.validateLanguageStandard(options.language);
      if (!result.success) return result;
    }

    // Validate checkers
    if (options.checkers) {
      result = InputValidator.validateCheckers(options.checkers);
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

    return { success: true };
  }

  private buildAnalyzerCommand(options: StaticAnalysisOptions, sourceFile: string, workDir: string): string[] {
    const command = ['clang', '--analyze'];

    // Language standard
    if (options.language) {
      if (options.language.startsWith('c++')) {
        command.push('-x', 'c++', `-std=${options.language}`);
      } else {
        command.push('-x', 'c', `-std=${options.language}`);
      }
    } else {
      // Default to C++17
      command.push('-x', 'c++', '-std=c++17');
    }

    // Enable specific checkers
    if (options.checkers && options.checkers.length > 0) {
      for (const checker of options.checkers) {
        command.push('-Xanalyzer', `-analyzer-checker=${checker}`);
      }
    } else {
      // Default checkers for security and correctness
      const defaultCheckers = [
        'core.CallAndMessage',
        'core.DivideZero',
        'core.NonNullParamChecker',
        'core.NullDereference',
        'core.UndefinedBinaryOperatorResult',
        'deadcode.DeadStores',
        'security.insecureAPI.UncheckedReturn',
        'unix.API',
        'unix.Malloc',
      ];
      
      for (const checker of defaultCheckers) {
        command.push('-Xanalyzer', `-analyzer-checker=${checker}`);
      }
    }

    // Output format - use text format for easier parsing
    command.push('-Xanalyzer', '-analyzer-output=text');

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

    // Disable warnings to focus on analysis results
    command.push('-w');

    // Source file
    command.push(sourceFile);

    return command;
  }


  private parseAnalysisResults(stdout: string, stderr: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const combinedOutput = `${stderr}\n${stdout}`;

    if (!combinedOutput.trim()) {
      return results;
    }

    const lines = combinedOutput.split('\n');
    let currentResult: Partial<AnalysisResult> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse clang static analyzer output format
      // Format: filename:line:column: warning: message [checker-name]
      const mainPattern = /^(.+?):(\d+):(\d+):\s*(warning|error|note):\s*(.+?)\s*\[([^\]]+)\]$/;
      const match = trimmedLine.match(mainPattern);

      if (match) {
        const [, , lineNum, columnNum, severity, message, checker] = match;
        
        // If we have a previous result, save it
        if (currentResult.checker) {
          results.push(currentResult as AnalysisResult);
        }

        currentResult = {
          checker: checker.trim(),
          line: parseInt(lineNum, 10),
          column: parseInt(columnNum, 10),
          message: message.trim(),
          severity: severity as 'error' | 'warning' | 'note',
          category: this.categorizeChecker(checker.trim()),
        };
      } else {
        // Check for simplified format without checker name
        const simplePattern = /^(.+?):(\d+):(\d+):\s*(warning|error|note):\s*(.+)$/;
        const simpleMatch = trimmedLine.match(simplePattern);

        if (simpleMatch) {
          const [, , lineNum, columnNum, severity, message] = simpleMatch;
          
          if (currentResult.checker) {
            results.push(currentResult as AnalysisResult);
          }

          currentResult = {
            checker: 'unknown',
            line: parseInt(lineNum, 10),
            column: parseInt(columnNum, 10),
            message: message.trim(),
            severity: severity as 'error' | 'warning' | 'note',
            category: 'general',
          };
        }
      }
    }

    // Add the last result if exists
    if (currentResult.checker) {
      results.push(currentResult as AnalysisResult);
    }

    // Sanitize results
    return results.map(result => ({
      ...result,
      message: OutputSanitizer.sanitizeCompilerOutput(result.message),
    }));
  }

  private categorizeChecker(checker: string): string {
    if (checker.startsWith('core.')) {
      return 'core';
    } else if (checker.startsWith('security.')) {
      return 'security';
    } else if (checker.startsWith('unix.')) {
      return 'unix';
    } else if (checker.startsWith('deadcode.')) {
      return 'deadcode';
    } else if (checker.startsWith('alpha.')) {
      return 'experimental';
    } else {
      return 'other';
    }
  }

  // Get available checkers
  async getAvailableCheckers(): Promise<string[]> {
    try {
      const result = await this.executeClang(['clang', '--analyzer-list-enabled-checkers'], 10);
      
      if (result.success) {
        const checkers = result.stdout
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.trim());
        
        return checkers;
      }
    } catch (error) {
      logger.warn('Failed to get available checkers', { error });
    }

    // Return default list if command fails
    return [
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
      'core.uninitialized.UndefReturn',
      'deadcode.DeadStores',
      'security.insecureAPI.UncheckedReturn',
      'security.insecureAPI.gets',
      'security.insecureAPI.strcpy',
      'unix.API',
      'unix.Malloc',
      'unix.MallocSizeof',
      'unix.MismatchedDeallocator',
    ];
  }
}