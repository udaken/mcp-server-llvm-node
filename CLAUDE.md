# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides C/C++ code compilation, static analysis, and AST generation using LLVM/Clang toolchain. **The server runs exclusively in Docker containers** with complete isolation and no host dependencies.

## Development Commands

**This project runs exclusively in Docker containers - no local Node.js required.**

```bash
# Start the MCP server (builds image if needed)
npm start

# Stop the MCP server
npm stop

# Connect to running server for testing
npm run connect

# Run comprehensive tests with MCP Inspector
npm test

# View server logs
npm run logs

# Check container status
npm run status

# Rebuild Docker image (after code changes)
npm run rebuild

# Clean up Docker resources
npm run clean
```

### Direct Docker Commands
```bash
# Test basic functionality
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker exec -i llvm-mcp-server node dist/index.js

# Manual container operations
docker logs llvm-mcp-server
docker exec -it llvm-mcp-server sh
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

- **Docker**: Version 20.0.0 or higher (only requirement)
- **No Node.js**: Not required on host machine
- **No LLVM**: All LLVM/Clang tools are containerized
- **MCP protocol compliance**: All operations through Docker containers

## Key Considerations

- All operations run in isolated Docker containers for security
- Resource limits enforced at container level (2 CPU cores, 1GB RAM)
- Automatic cleanup of compilation artifacts
- Complete separation between host and compilation environment
- stdio transport for MCP communication through Docker exec

## Docker-First Architecture

- **Container Base**: node:lts-alpine with LLVM/Clang 20.1.8
- **Security**: Non-root user, read-only filesystem, resource limits
- **Isolation**: Complete sandboxing with no network access during compilation
- **MCP Protocol**: stdio and future SSE transport support through containers
- **Testing**: Built-in @modelcontextprotocol/inspector integration for validation