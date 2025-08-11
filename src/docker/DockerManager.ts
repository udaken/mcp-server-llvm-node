import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface ContainerConfig {
  image: string;
  workingDir: string;
  user: string;
  timeout: number;
  memoryLimit: string;
  cpuLimit: string;
}

export interface CompilationResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  containerId?: string;
}

export interface DockerOptions {
  sourceCode: string;
  command: string[];
  timeout?: number;
  workingDir?: string;
}

export class DockerManager {
  private readonly defaultImage = 'llvm-mcp-server:latest';
  private readonly defaultConfig: ContainerConfig = {
    image: this.defaultImage,
    workingDir: '/workspace',
    user: 'compiler',
    timeout: 60000, // 60 seconds
    memoryLimit: '512m',
    cpuLimit: '2',
  };

  async executeInContainer(options: DockerOptions): Promise<CompilationResult> {
    const startTime = Date.now();
    const containerId = `mcp-compilation-${randomUUID()}`;
    const tempDir = await this.createTempDirectory();

    try {
      // Write source code to temporary file
      const sourceFile = path.join(tempDir, 'main.cpp');
      await fs.writeFile(sourceFile, options.sourceCode, 'utf-8');

      // Prepare Docker command
      const dockerArgs = [
        'run',
        '--rm',
        '--name', containerId,
        '--user', this.defaultConfig.user,
        '--workdir', this.defaultConfig.workingDir,
        '--memory', this.defaultConfig.memoryLimit,
        '--cpus', this.defaultConfig.cpuLimit,
        '--network', 'none', // No network access
        '--read-only', // Read-only filesystem
        '--tmpfs', '/tmp:noexec,nosuid,size=100m',
        '--security-opt', 'no-new-privileges:true',
        '--cap-drop', 'ALL',
        '-v', `${tempDir}:${this.defaultConfig.workingDir}:rw`,
        this.defaultImage,
        ...options.command,
      ];

      const result = await this.runDockerCommand(dockerArgs, {
        timeout: options.timeout || this.defaultConfig.timeout,
      });

      return {
        ...result,
        containerId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        containerId,
      };
    } finally {
      await this.cleanup(tempDir);
    }
  }

  private async createTempDirectory(): Promise<string> {
    const tempDir = path.join(process.cwd(), 'tmp', randomUUID());
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  private async cleanup(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }

  private async runDockerCommand(
    args: string[],
    options: { timeout: number }
  ): Promise<Omit<CompilationResult, 'executionTime' | 'containerId'>> {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', args);
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        docker.kill('SIGKILL');
        reject(new Error(`Docker command timed out after ${options.timeout}ms`));
      }, options.timeout);

      docker.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      docker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      docker.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          success: code === 0,
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });
    });
  }

  async buildImage(): Promise<void> {
    console.log('Building Docker image...');
    const result = await this.runDockerCommand(['build', '-t', this.defaultImage, '.'], {
      timeout: 300000, // 5 minutes for building
    });

    if (!result.success) {
      throw new Error(`Failed to build Docker image: ${result.stderr}`);
    }
    
    console.log('Docker image built successfully');
  }

  async testEnvironment(): Promise<boolean> {
    try {
      const result = await this.executeInContainer({
        sourceCode: '#include <iostream>\nint main() { std::cout << "test"; return 0; }',
        command: ['clang++', '-o', 'test', 'main.cpp'],
      });

      return result.success;
    } catch (error) {
      console.error('Docker environment test failed:', error);
      return false;
    }
  }
}