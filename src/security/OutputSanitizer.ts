import path from 'path';

export class OutputSanitizer {
  private static readonly MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB

  static sanitizeCompilerOutput(output: string): string {
    if (typeof output !== 'string') {
      return '';
    }

    // Limit output size
    if (output.length > this.MAX_OUTPUT_SIZE) {
      output = output.substring(0, this.MAX_OUTPUT_SIZE) + '\n... (output truncated)';
    }

    // Remove absolute paths - replace with relative paths
    let sanitized = output;

    // Common path patterns to sanitize
    const pathPatterns = [
      // Unix-style absolute paths
      /\/[a-zA-Z0-9_./\-]+\/workspace\/([a-zA-Z0-9_./\-]+)/g,
      /\/tmp\/[a-zA-Z0-9_./\-]+\/([a-zA-Z0-9_./\-]+)/g,
      /\/[a-zA-Z0-9_./\-]*\/([a-zA-Z0-9_./\-]*\.(cpp|c|h|hpp|cc|cxx))([:\s])/g,
      
      // Windows-style paths (if any)
      /[A-Z]:\\[a-zA-Z0-9_.\\\-]+\\workspace\\([a-zA-Z0-9_.\\\-]+)/g,
      /[A-Z]:\\[a-zA-Z0-9_.\\\-]+\\([a-zA-Z0-9_.\\\-]*\.(cpp|c|h|hpp|cc|cxx))([:\s])/g,
    ];

    pathPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match, filename, ext, suffix) => {
        if (suffix) {
          return `${filename}${ext}${suffix}`;
        }
        return filename;
      });
    });

    // Remove container-specific information
    sanitized = sanitized.replace(/\/workspace\//g, './');
    sanitized = sanitized.replace(/\/tmp\/[a-zA-Z0-9_-]+\//g, './');

    // Remove user information
    sanitized = sanitized.replace(/User ID: \d+/g, '');
    sanitized = sanitized.replace(/Group ID: \d+/g, '');

    // Remove system-specific library paths
    sanitized = sanitized.replace(/\/usr\/lib\/[a-zA-Z0-9_.\/-]+/g, '<system_lib>');
    sanitized = sanitized.replace(/\/lib\/[a-zA-Z0-9_.\/-]+/g, '<system_lib>');

    // Clean up multiple newlines
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return sanitized.trim();
  }

  static sanitizeErrorMessages(stderr: string): string {
    if (typeof stderr !== 'string') {
      return '';
    }

    let sanitized = this.sanitizeCompilerOutput(stderr);

    // Remove container ID information
    sanitized = sanitized.replace(/container [a-f0-9]{12,}/gi, 'container <id>');

    // Remove process ID information
    sanitized = sanitized.replace(/PID: \d+/g, 'PID: <id>');
    sanitized = sanitized.replace(/process \d+/g, 'process <id>');

    // Remove timestamps that might leak timing information
    sanitized = sanitized.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '<timestamp>');

    return sanitized;
  }

  static sanitizeFilePaths(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    // Normalize file paths to just filenames
    let sanitized = text;

    // Replace full paths with just the filename
    sanitized = sanitized.replace(/(?:^|[\s:])([\/\\].*?[\/\\])?([a-zA-Z0-9_.-]+\.(cpp|c|h|hpp|cc|cxx))(?=[\s:$])/g, 
      (match, pathPart, filename) => {
        return match.replace(pathPart || '', '');
      }
    );

    return sanitized;
  }

  static limitOutputSize(output: string, maxSize: number = this.MAX_OUTPUT_SIZE): string {
    if (typeof output !== 'string') {
      return '';
    }

    if (output.length <= maxSize) {
      return output;
    }

    const truncationMsg = '\n... (output truncated due to size limit)';
    const availableSize = maxSize - truncationMsg.length;

    return output.substring(0, Math.max(0, availableSize)) + truncationMsg;
  }

  static removeSystemInfo(output: string): string {
    if (typeof output !== 'string') {
      return '';
    }

    let sanitized = output;

    // Remove version information that might leak system details
    sanitized = sanitized.replace(/clang version [0-9]+\.[0-9]+\.[0-9]+[^\n]*/g, 'clang version <version>');
    sanitized = sanitized.replace(/gcc version [0-9]+\.[0-9]+\.[0-9]+[^\n]*/g, 'gcc version <version>');

    // Remove target triple information
    sanitized = sanitized.replace(/Target: [a-zA-Z0-9_.-]+/g, 'Target: <target>');

    // Remove installation directory information
    sanitized = sanitized.replace(/InstalledDir: [^\n]+/g, 'InstalledDir: <path>');

    // Remove thread model information
    sanitized = sanitized.replace(/Thread model: [^\n]+/g, 'Thread model: <model>');

    return sanitized;
  }

  static sanitizeStdout(stdout: string): string {
    let sanitized = stdout;
    sanitized = this.sanitizeCompilerOutput(sanitized);
    sanitized = this.sanitizeFilePaths(sanitized);
    sanitized = this.removeSystemInfo(sanitized);
    return sanitized;
  }

  static sanitizeStderr(stderr: string): string {
    let sanitized = stderr;
    sanitized = this.sanitizeErrorMessages(sanitized);
    sanitized = this.sanitizeFilePaths(sanitized);
    sanitized = this.removeSystemInfo(sanitized);
    return sanitized;
  }

  static sanitizeAST(ast: string): string {
    let sanitized = ast;
    sanitized = this.sanitizeFilePaths(sanitized);
    sanitized = this.limitOutputSize(sanitized);
    
    // Remove memory addresses from AST output
    sanitized = sanitized.replace(/0x[a-fA-F0-9]+/g, '<address>');
    
    // Remove line and column information that might reference absolute paths
    sanitized = sanitized.replace(/line:\d+ col:\d+/g, 'line:<line> col:<col>');
    
    return sanitized;
  }
}