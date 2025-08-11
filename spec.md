# Technical Specification: LLVM MCP Server

## Overview

This MCP server provides C/C++ code compilation and diagnostic capabilities using LLVM/Clang toolchain. It accepts source code and compilation options, performs compilation in a secure Docker environment, and returns detailed diagnostic information.

## MCP Protocol Compliance

### Server Information
- **Name**: llvm-mcp-server
- **Version**: 1.0.0
- **Protocol Version**: 2024-11-05
- **Transports**: stdio, SSE

### Tools

#### 1. compile_cpp
Compiles C/C++ source code using Clang compiler.

**Parameters**:
- `source_code` (string, required): C/C++ source code to compile
- `language` (string, optional): Language standard (c89, c99, c11, c17, c23, c++98, c++03, c++11, c++14, c++17, c++20, c++23)
- `optimization` (string, optional): Optimization level (O0, O1, O2, O3, Os, Oz, Ofast)
- `warnings` (string, optional): Warning level (none, all, extra, pedantic, error)
- `defines` (array[string], optional): Preprocessor definitions
- `includes` (array[string], optional): Additional include paths
- `flags` (array[string], optional): Additional compiler flags
- `compile_only` (boolean, optional): Compile only, don't link (default: true)
- `timeout` (number, optional): Compilation timeout in seconds (default: 30, max: 60)

**Returns**:
```json
{
  "success": boolean,
  "exit_code": number,
  "stdout": string,
  "stderr": string,
  "diagnostics": {
    "errors": [
      {
        "line": number,
        "column": number,
        "message": string,
        "severity": "error" | "warning" | "note"
      }
    ],
    "warnings": [...],
    "notes": [...]
  },
  "compilation_time": number,
  "clang_version": string
}
```

#### 2. analyze_cpp
Performs static analysis on C/C++ code using Clang static analyzer.

**Parameters**:
- `source_code` (string, required): C/C++ source code to analyze
- `language` (string, optional): Language standard
- `checkers` (array[string], optional): Static analysis checkers to enable
- `defines` (array[string], optional): Preprocessor definitions
- `includes` (array[string], optional): Additional include paths

**Returns**:
```json
{
  "success": boolean,
  "analysis_results": [
    {
      "checker": string,
      "line": number,
      "column": number,
      "message": string,
      "severity": "error" | "warning" | "note",
      "category": string
    }
  ],
  "analysis_time": number
}
```

#### 3. get_ast
Generates and returns Abstract Syntax Tree (AST) for C/C++ code.

**Parameters**:
- `source_code` (string, required): C/C++ source code
- `language` (string, optional): Language standard
- `format` (string, optional): AST output format (json, dump, graphviz)

**Returns**:
```json
{
  "success": boolean,
  "ast": string,
  "format": string,
  "generation_time": number
}
```

### Resources

#### 1. supported_standards
Lists supported C/C++ language standards.

**URI**: `llvm://standards`

#### 2. compiler_info
Provides information about the LLVM/Clang installation.

**URI**: `llvm://compiler-info`

#### 3. available_checkers
Lists available static analysis checkers.

**URI**: `llvm://checkers`

## Security Requirements

### Sandboxing
- All compilation occurs within Docker containers
- No network access during compilation
- Limited filesystem access (read-only source, write-only temp)
- Resource limits: CPU (2 cores max), Memory (512MB max), Disk (100MB max)
- Process execution timeout (60 seconds max)

### Input Validation
- Source code size limit: 1MB
- Sanitize all compiler flags to prevent command injection
- Whitelist allowed compiler flags and options
- Validate file paths in include directories

### Output Sanitization
- Remove absolute file paths from error messages
- Limit output size (10MB max)
- Filter sensitive system information

## Performance Requirements

- **Compilation Response Time**: < 5 seconds for typical code (< 1000 lines)
- **Concurrent Requests**: Support up to 10 simultaneous compilations
- **Resource Usage**: 
  - CPU: < 50% average usage
  - Memory: < 1GB total server memory
  - Disk: < 10GB for all temporary files

## Error Handling

### Error Categories
1. **Input Validation Errors**: Invalid parameters, oversized inputs
2. **Compilation Errors**: Syntax errors, semantic errors in source code
3. **System Errors**: Docker failures, resource exhaustion, timeouts
4. **Protocol Errors**: MCP protocol violations

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details": object
  }
}
```

## Docker Environment

### Base Image
- `node:lts-alpine` (Node.js 22 LTS)
- LLVM/Clang 17+ installation
- Required system packages for compilation

### Container Configuration
- Non-root user execution
- Read-only root filesystem where possible
- Temporary filesystem for compilation artifacts
- Network isolation (no external network access)
- Resource constraints (CPU, memory, disk)

## Testing Requirements

### Unit Tests
- Tool parameter validation
- Compilation result parsing
- Error handling scenarios

### Integration Tests
- MCP protocol compliance using @modelcontextprotocol/inspector
- Docker container functionality
- End-to-end compilation workflows

### Performance Tests
- Compilation speed benchmarks
- Concurrent request handling
- Resource usage monitoring

## Monitoring and Logging

### Metrics
- Compilation success/failure rates
- Average compilation time
- Resource usage statistics
- Error frequency by category

### Logging
- Structured JSON logging
- Request/response logging (sanitized)
- Error logging with stack traces
- Performance metrics logging