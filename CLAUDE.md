# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides C/C++ code compilation, static analysis, and AST generation using LLVM/Clang toolchain. The server runs in Node.js 22 and uses Docker containers for secure, isolated compilation.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build the project
npm run build

# Run tests
npm test
npm run test:watch  # Watch mode

# Linting and formatting
npm run lint
npm run lint:fix
npm run format

# Start the MCP server
npm start

# Clean build artifacts
npm run clean

# Docker operations
chmod +x scripts/*.sh
./scripts/build-docker.sh    # Build Docker image
./scripts/test-docker.sh     # Test Docker environment
```

## Architecture Notes

The project is structured as follows:

- **src/server.ts**: Main MCP server implementation with tool handlers
- **src/docker/**: Docker container management for isolated compilation
- **src/tools/**: Individual tool implementations (compile_cpp, analyze_cpp, get_ast)
- **src/security/**: Input validation and output sanitization
- **src/types/**: TypeScript type definitions
- **src/utils/**: Logging and utility functions
- **tests/**: Unit and integration tests
- **scripts/**: Docker build and test scripts

### MCP Tools Implemented:
- `compile_cpp`: Compiles C/C++ code with various options and returns diagnostics
- `analyze_cpp`: Performs static analysis using Clang Static Analyzer  
- `get_ast`: Generates Abstract Syntax Trees in multiple formats

### MCP Resources:
- `llvm://standards`: Supported C/C++ language standards
- `llvm://compiler-info`: LLVM/Clang installation information
- `llvm://checkers`: Available static analysis checkers

## Development Environment

- Node.js environment with TypeScript support
- LLVM integration requiring appropriate LLVM development libraries
- MCP protocol compliance for tool and resource definitions
- Potential native bindings for LLVM C++ APIs

## Key Considerations

- LLVM operations may require significant system resources
- Security considerations for code analysis and compilation operations
- Proper error handling for LLVM compilation and analysis failures
- Memory management for large codebases and AST operations
- stdio, sse に対応した MCP サーバーを実装してください
- このMCPサーバーはソースコードを受け取り llvm/clang でコンパイルした結果等を返す事で、ユーザーから受け取った正確なC/C++コード片の診断を行うことができます
- 最適化、言語バージョン、各種フラグなど多彩なコンパイルオプションを受け取ります
- node.js 22 を使用します。
- Docker で実行します。ベースは node:lts-alpine です
- 各コマンドが動作するか、@modelcontextprotocol/inspector を使ってテストも行ってっください