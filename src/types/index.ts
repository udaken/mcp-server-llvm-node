// Common types for the LLVM MCP Server

export type LanguageStandard = 
  | 'c89' | 'c99' | 'c11' | 'c17' | 'c23'
  | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';

export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Oz' | 'Ofast';

export type WarningLevel = 'none' | 'all' | 'extra' | 'pedantic' | 'error';

export type ASTFormat = 'json' | 'dump' | 'graphviz';

export interface CompilationOptions {
  sourceCode: string;
  language?: LanguageStandard;
  optimization?: OptimizationLevel;
  warnings?: WarningLevel;
  defines?: string[];
  includes?: string[];
  flags?: string[];
  compileOnly?: boolean;
  timeout?: number;
}

export interface StaticAnalysisOptions {
  sourceCode: string;
  language?: LanguageStandard;
  checkers?: string[];
  defines?: string[];
  includes?: string[];
}

export interface ASTOptions {
  sourceCode: string;
  language?: LanguageStandard;
  format?: ASTFormat;
}

export interface DiagnosticMessage {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'note';
}

export interface CompilationDiagnostics {
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
  notes: DiagnosticMessage[];
}

export interface CompilationResponse {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  diagnostics: CompilationDiagnostics;
  compilationTime: number;
  clangVersion: string;
}

export interface AnalysisResult {
  checker: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'note';
  category: string;
}

export interface StaticAnalysisResponse {
  success: boolean;
  analysisResults: AnalysisResult[];
  analysisTime: number;
}

export interface ASTResponse {
  success: boolean;
  ast: string;
  format: ASTFormat;
  generationTime: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}