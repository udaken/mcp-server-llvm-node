import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CompilationTool } from './tools/CompilationTool.js';
import { StaticAnalysisTool } from './tools/StaticAnalysisTool.js';
import { ASTTool } from './tools/ASTTool.js';
import { logger } from './utils/logger.js';
import type { 
  CompilationOptions, 
  StaticAnalysisOptions, 
  ASTOptions 
} from './types/index.js';

export class LLVMMCPServer {
  private server: Server;
  private compilationTool: CompilationTool;
  private staticAnalysisTool: StaticAnalysisTool;
  private astTool: ASTTool;

  constructor() {
    this.server = new Server(
      {
        name: 'llvm-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize tools
    this.compilationTool = new CompilationTool();
    this.staticAnalysisTool = new StaticAnalysisTool();
    this.astTool = new ASTTool();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'compile_cpp',
          description: 'Compile C/C++ source code using Clang compiler',
          inputSchema: {
            type: 'object',
            properties: {
              source_code: {
                type: 'string',
                description: 'C/C++ source code to compile',
              },
              language: {
                type: 'string',
                description: 'Language standard (c++11, c++14, c++17, c++20, c++23)',
                enum: ['c89', 'c99', 'c11', 'c17', 'c23', 'c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'],
                default: 'c++17',
              },
              optimization: {
                type: 'string',
                description: 'Optimization level',
                enum: ['O0', 'O1', 'O2', 'O3', 'Os', 'Oz', 'Ofast'],
                default: 'O2',
              },
              warnings: {
                type: 'string',
                description: 'Warning level',
                enum: ['none', 'all', 'extra', 'pedantic', 'error'],
                default: 'pedantic',
              },
              defines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Preprocessor definitions',
                default: [],
              },
              includes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional include paths',
                default: [],
              },
              flags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional compiler flags',
                default: [],
              },
              compile_only: {
                type: 'boolean',
                description: 'Compile only, do not link',
                default: true,
              },
              timeout: {
                type: 'number',
                description: 'Compilation timeout in seconds',
                minimum: 1,
                maximum: 60,
                default: 30,
              },
            },
            required: ['source_code'],
          },
        },
        {
          name: 'analyze_cpp',
          description: 'Perform static analysis on C/C++ code using Clang Static Analyzer',
          inputSchema: {
            type: 'object',
            properties: {
              source_code: {
                type: 'string',
                description: 'C/C++ source code to analyze',
              },
              language: {
                type: 'string',
                description: 'Language standard',
                enum: ['c89', 'c99', 'c11', 'c17', 'c23', 'c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'],
                default: 'c++17',
              },
              checkers: {
                type: 'array',
                items: { type: 'string' },
                description: 'Static analysis checkers to enable',
                default: [],
              },
              defines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Preprocessor definitions',
                default: [],
              },
              includes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional include paths',
                default: [],
              },
            },
            required: ['source_code'],
          },
        },
        {
          name: 'get_ast',
          description: 'Generate Abstract Syntax Tree (AST) for C/C++ code',
          inputSchema: {
            type: 'object',
            properties: {
              source_code: {
                type: 'string',
                description: 'C/C++ source code',
              },
              language: {
                type: 'string',
                description: 'Language standard',
                enum: ['c89', 'c99', 'c11', 'c17', 'c23', 'c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'],
                default: 'c++17',
              },
              format: {
                type: 'string',
                description: 'AST output format',
                enum: ['json', 'dump', 'graphviz'],
                default: 'dump',
              },
            },
            required: ['source_code'],
          },
        },
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'llvm://standards',
          name: 'Supported C/C++ Standards',
          description: 'List of supported C/C++ language standards',
          mimeType: 'application/json',
        },
        {
          uri: 'llvm://compiler-info',
          name: 'Compiler Information',
          description: 'Information about the LLVM/Clang installation',
          mimeType: 'application/json',
        },
        {
          uri: 'llvm://checkers',
          name: 'Available Static Analysis Checkers',
          description: 'List of available static analysis checkers',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'compile_cpp':
          return await this.handleCompileCpp(args);
        case 'analyze_cpp':
          return await this.handleAnalyzeCpp(args);
        case 'get_ast':
          return await this.handleGetAst(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'llvm://standards':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  c_standards: ['c89', 'c99', 'c11', 'c17', 'c23'],
                  cpp_standards: ['c++98', 'c++03', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'],
                }),
              },
            ],
          };
        case 'llvm://compiler-info':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  compiler: 'clang',
                  version: 'Dynamic (retrieved from container)',
                  target: 'x86_64-alpine-linux-musl',
                }),
              },
            ],
          };
        case 'llvm://checkers':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  core: ['core.CallAndMessage', 'core.DivideZero', 'core.NonNullParamChecker'],
                  deadcode: ['deadcode.DeadStores'],
                  security: ['security.insecureAPI.UncheckedReturn'],
                  unix: ['unix.Malloc', 'unix.MallocSizeof'],
                }),
              },
            ],
          };
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private async handleCompileCpp(args: unknown): Promise<{ content: { type: string; text: string }[] }> {
    try {
      const validatedArgs = z
        .object({
          source_code: z.string(),
          language: z.string().optional().default('c++17'),
          optimization: z.string().optional().default('O2'),
          warnings: z.string().optional().default('pedantic'),
          defines: z.array(z.string()).optional().default([]),
          includes: z.array(z.string()).optional().default([]),
          flags: z.array(z.string()).optional().default([]),
          compile_only: z.boolean().optional().default(true),
          timeout: z.number().min(1).max(60).optional().default(30),
        })
        .parse(args);

      const options: CompilationOptions = {
        sourceCode: validatedArgs.source_code,
        language: validatedArgs.language as any,
        optimization: validatedArgs.optimization as any,
        warnings: validatedArgs.warnings as any,
        defines: validatedArgs.defines,
        includes: validatedArgs.includes,
        flags: validatedArgs.flags,
        compileOnly: validatedArgs.compile_only,
        timeout: validatedArgs.timeout,
      };

      const result = await this.compilationTool.compile(options);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to handle compile_cpp', { error });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'HANDLER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleAnalyzeCpp(args: unknown): Promise<{ content: { type: string; text: string }[] }> {
    try {
      const validatedArgs = z
        .object({
          source_code: z.string(),
          language: z.string().optional().default('c++17'),
          checkers: z.array(z.string()).optional().default([]),
          defines: z.array(z.string()).optional().default([]),
          includes: z.array(z.string()).optional().default([]),
        })
        .parse(args);

      const options: StaticAnalysisOptions = {
        sourceCode: validatedArgs.source_code,
        language: validatedArgs.language as any,
        checkers: validatedArgs.checkers,
        defines: validatedArgs.defines,
        includes: validatedArgs.includes,
      };

      const result = await this.staticAnalysisTool.analyze(options);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to handle analyze_cpp', { error });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'HANDLER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleGetAst(args: unknown): Promise<{ content: { type: string; text: string }[] }> {
    try {
      const validatedArgs = z
        .object({
          source_code: z.string(),
          language: z.string().optional().default('c++17'),
          format: z.string().optional().default('dump'),
        })
        .parse(args);

      const options: ASTOptions = {
        sourceCode: validatedArgs.source_code,
        language: validatedArgs.language as any,
        format: validatedArgs.format as any,
      };

      const result = await this.astTool.generateAST(options);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to handle get_ast', { error });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'HANDLER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            }, null, 2),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('LLVM MCP Server running on stdio');
  }
}