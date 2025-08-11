import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

export interface ClangExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export abstract class BaseClangTool {
  protected readonly tempDir: string;

  constructor() {
    // Determine temp directory based on available system paths
    // Priority: explicit MCP_TEMP_DIR > system temp paths > current working directory fallback
    this.tempDir = this.determineTempDir();
  }

  /**
   * Determine the best available temporary directory
   */
  private determineTempDir(): string {
    // If explicitly set, use it
    if (process.env.MCP_TEMP_DIR) {
      return process.env.MCP_TEMP_DIR;
    }

    // Try system temp directories in order of preference
    const candidates = [
      '/tmp/mcp-compilation',
      '/tmp',
      process.env.TMPDIR,
      process.env.TEMP,
      process.env.TMP,
      path.join(process.cwd(), 'tmp')
    ].filter(Boolean) as string[];

    // For Unix-like systems (including Docker containers)
    if (process.platform !== 'win32') {
      return '/tmp/mcp-compilation';
    }

    // For Windows, prefer system temp directories
    return process.env.TEMP || process.env.TMP || path.join(process.cwd(), 'tmp');
  }

  /**
   * Execute a clang command with timeout and proper process management
   */
  protected async executeClang(command: string[], timeout: number, timeoutMessage?: string): Promise<ClangExecutionResult> {
    return new Promise((resolve) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      };

      timeoutHandle = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: stderr + `\n${timeoutMessage || 'Clang execution timed out'}`,
        });
      }, timeout * 1000);

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        cleanup();
        resolve({
          success: code === 0,
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      process.on('error', (error) => {
        cleanup();
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: stderr + `\nProcess error: ${error.message}`,
        });
      });
    });
  }

  /**
   * Get the appropriate file extension for a given language
   */
  protected getFileExtension(language: string): string {
    if (language.startsWith('c++') || language === 'cpp') {
      return 'cpp';
    }
    return 'c';
  }

  /**
   * Create a temporary working directory and source file
   */
  protected async createWorkEnvironment(sourceCode: string, language: string): Promise<{
    workDir: string;
    sourceFile: string;
  }> {
    const workDir = path.join(this.tempDir, randomUUID());
    await fs.mkdir(workDir, { recursive: true });
    
    const sourceFile = path.join(workDir, `source.${this.getFileExtension(language)}`);
    await fs.writeFile(sourceFile, sourceCode);

    return { workDir, sourceFile };
  }

  /**
   * Clean up temporary working directory
   */
  protected async cleanupWorkEnvironment(workDir: string): Promise<void> {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to cleanup work directory', { workDir, error });
    }
  }

  /**
   * Execute a complete clang operation with automatic cleanup
   */
  protected async executeWithCleanup<T>(
    sourceCode: string,
    language: string,
    operation: (workDir: string, sourceFile: string) => Promise<T>
  ): Promise<T> {
    const { workDir, sourceFile } = await this.createWorkEnvironment(sourceCode, language);
    
    try {
      return await operation(workDir, sourceFile);
    } finally {
      await this.cleanupWorkEnvironment(workDir);
    }
  }

  /**
   * Extract Clang version from output
   */
  protected extractClangVersion(stdout: string, stderr: string): string {
    const combinedOutput = `${stdout}\n${stderr}`;
    
    const versionMatch = combinedOutput.match(/clang version ([0-9]+\.[0-9]+\.[0-9]+)/);
    if (versionMatch) {
      return `clang version ${versionMatch[1]}`;
    }

    return 'clang (version unknown)';
  }
}