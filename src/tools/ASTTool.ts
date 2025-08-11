import { InputValidator, type ValidationResult } from '../security/InputValidator.js';
import { OutputSanitizer } from '../security/OutputSanitizer.js';
import { logger } from '../utils/logger.js';
import type { 
  ASTOptions, 
  ASTResponse,
  ASTFormat,
  ErrorResponse 
} from '../types/index.js';
import { BaseClangTool } from './BaseClangTool.js';

export class ASTTool extends BaseClangTool {
  constructor() {
    super();
  }

  async generateAST(options: ASTOptions): Promise<ASTResponse | ErrorResponse> {
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

      // Execute AST generation with automatic cleanup
      const result = await this.executeWithCleanup(
        options.sourceCode,
        options.language || 'c++17',
        async (workDir, sourceFile) => {
          const astCommand = this.buildASTCommand(options, sourceFile, workDir);
          logger.debug('Generating AST', { command: astCommand, format: options.format });
          return await this.executeClang(astCommand, 30, 'AST generation timed out');
        }
      );

      let astOutput = '';
      if (result.success) {
        astOutput = result.stdout;
      } else {
        // Sometimes AST is output to stderr
        astOutput = result.stderr;
      }

      // Sanitize AST output
      const sanitizedAST = OutputSanitizer.sanitizeAST(astOutput);

      const response: ASTResponse = {
        success: !!astOutput.trim(),
        ast: sanitizedAST,
        format: options.format || 'dump',
        generationTime: (Date.now() - startTime) / 1000,
      };

      logger.info('AST generation completed', { 
        success: response.success,
        format: response.format,
        generationTime: response.generationTime,
        astSize: sanitizedAST.length,
      });

      return response;

    } catch (error) {
      logger.error('AST generation failed', { error: error instanceof Error ? error.message : error });
      
      return {
        success: false,
        error: {
          code: 'AST_ERROR',
          message: error instanceof Error ? error.message : 'Unknown AST generation error',
          details: { executionTime: (Date.now() - startTime) / 1000 },
        },
      };
    }
  }

  private validateInputs(options: ASTOptions): ValidationResult {
    // Validate source code
    let result = InputValidator.validateSourceCode(options.sourceCode);
    if (!result.success) return result;

    // Validate language standard
    if (options.language) {
      result = InputValidator.validateLanguageStandard(options.language);
      if (!result.success) return result;
    }

    // Validate AST format
    if (options.format) {
      const validFormats: ASTFormat[] = ['json', 'dump', 'graphviz'];
      if (!validFormats.includes(options.format)) {
        return {
          success: false,
          error: `Invalid AST format. Must be one of: ${validFormats.join(', ')}`,
        };
      }
    }

    return { success: true };
  }

  private buildASTCommand(options: ASTOptions, sourceFile: string, workDir: string): string[] {
    const command = ['clang'];
    const format = options.format || 'dump';

    // Language detection and configuration
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

    // AST output format
    switch (format) {
      case 'json':
        command.push('-Xclang', '-ast-dump=json', '-fsyntax-only');
        break;
      
      case 'dump':
        command.push('-Xclang', '-ast-dump', '-fsyntax-only');
        break;
      
      case 'graphviz':
        command.push('-Xclang', '-ast-view', '-fsyntax-only');
        break;
      
      default:
        command.push('-Xclang', '-ast-dump', '-fsyntax-only');
    }

    // Disable warnings to focus on AST
    command.push('-w');

    // Source file
    command.push(sourceFile);

    return command;
  }


  // Get compiler information for AST capabilities
  async getCompilerInfo(): Promise<{ clangVersion: string; astFormats: ASTFormat[] }> {
    try {
      const result = await this.executeClang(['clang', '--version'], 10);
      
      let clangVersion = 'unknown';
      if (result.success) {
        const versionMatch = result.stdout.match(/clang version ([0-9]+\.[0-9]+\.[0-9]+)/);
        if (versionMatch) {
          clangVersion = versionMatch[1];
        }
      }

      return {
        clangVersion,
        astFormats: ['json', 'dump', 'graphviz'],
      };
    } catch (error) {
      logger.warn('Failed to get compiler info', { error });
      return {
        clangVersion: 'unknown',
        astFormats: ['json', 'dump', 'graphviz'],
      };
    }
  }

  // Validate that AST generation is working
  async testASTGeneration(): Promise<boolean> {
    try {
      const testOptions: ASTOptions = {
        sourceCode: 'int main() { return 0; }',
        language: 'c++17',
        format: 'dump',
      };

      const result = await this.generateAST(testOptions);
      return 'success' in result && result.success && result.ast.includes('FunctionDecl');
    } catch (error) {
      logger.error('AST generation test failed', { error });
      return false;
    }
  }

  // Parse AST for specific information (utility method)
  parseASTForFunctions(ast: string): Array<{ name: string; line?: number; returnType?: string }> {
    const functions: Array<{ name: string; line?: number; returnType?: string }> = [];
    
    if (!ast) return functions;

    // Parse clang AST dump format for function declarations
    const lines = ast.split('\n');
    
    for (const line of lines) {
      // Look for FunctionDecl patterns
      const funcMatch = line.match(/FunctionDecl.*?(\w+)\s+['"]([^'"]+)['"]/);
      if (funcMatch) {
        const [, , functionName] = funcMatch;
        
        // Extract line number if available
        const lineMatch = line.match(/line:(\d+)/);
        const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
        
        // Extract return type if available
        const typeMatch = line.match(/['"]([^'"]*)\s*\(/);
        const returnType = typeMatch ? typeMatch[1] : undefined;
        
        functions.push({
          name: functionName,
          line: lineNumber,
          returnType,
        });
      }
    }
    
    return functions;
  }

  // Parse AST for class/struct declarations
  parseASTForClasses(ast: string): Array<{ name: string; line?: number; type: 'class' | 'struct' }> {
    const classes: Array<{ name: string; line?: number; type: 'class' | 'struct' }> = [];
    
    if (!ast) return classes;

    const lines = ast.split('\n');
    
    for (const line of lines) {
      // Look for CXXRecordDecl patterns
      const classMatch = line.match(/(CXXRecordDecl|RecordDecl).*?(class|struct)\s+(\w+)/);
      if (classMatch) {
        const [, , type, className] = classMatch;
        
        const lineMatch = line.match(/line:(\d+)/);
        const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
        
        classes.push({
          name: className,
          line: lineNumber,
          type: type as 'class' | 'struct',
        });
      }
    }
    
    return classes;
  }
}