# LLVM MCP Server

An MCP (Model Context Protocol) server that provides C/C++ code compilation and analysis tools using LLVM/Clang toolchain. **This server runs exclusively in Docker containers** - no local Node.js installation required.

## Features

- **C/C++ Compilation**: Compile code with various optimization levels and language standards
- **Static Analysis**: Analyze code using Clang Static Analyzer
- **AST Generation**: Generate Abstract Syntax Trees in multiple formats
- **Docker-Only Execution**: Complete isolation, no host dependencies
- **Security**: Sandboxed execution with hardened containers
- **Multiple Transports**: Support for stdio and SSE transports

## Prerequisites

- **Docker**: Version 20.0.0 or higher
- **No Node.js required on host machine**

## Quick Start

```bash
# Start the MCP server
npm start

# Test the server
npm test

# Connect interactively
npm run connect

# View logs
npm run logs

# Stop the server
npm stop
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Build and start the MCP server in Docker |
| `npm stop` | Stop and remove the MCP server container |
| `npm run connect` | Connect to running server for interactive testing |
| `npm test` | Run comprehensive tests with MCP Inspector |
| `npm run logs` | View server logs in real-time |
| `npm run status` | Check container status |
| `npm run rebuild` | Rebuild Docker image |
| `npm run clean` | Clean up unused Docker images and containers |

### Alternative Script Usage

You can also use the shell scripts directly for more control:

| Script | Description |
|--------|-------------|
| `./scripts/start-mcp-server.sh` | Build and start the MCP server container |
| `./scripts/stop-mcp-server.sh` | Stop and remove the MCP server container |
| `./scripts/connect-mcp-server.sh` | Connect to running server for interactive testing |
| `./scripts/test-mcp-docker.sh` | Run comprehensive tests with MCP Inspector |
| `./scripts/docker-compose-commands.sh` | Comprehensive Docker Compose helper with all operations |

## Tools

### compile_cpp
Compiles C/C++ source code with customizable options:
- Language standards (C89-C23, C++98-C++23)
- Optimization levels (O0, O1, O2, O3, Os, Oz, Ofast)
- Warning levels and custom flags
- Preprocessor definitions and include paths

### analyze_cpp
Performs static analysis on C/C++ code:
- Configurable checkers
- Security vulnerability detection
- Code quality analysis

### get_ast
Generates Abstract Syntax Trees:
- Multiple output formats (JSON, dump, Graphviz)
- Detailed syntax tree information

## Usage Examples

### Basic Tool Testing
```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i llvm-mcp-server node dist/index.js

# Compile C++ code
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "compile_cpp",
    "arguments": {
      "source_code": "#include <iostream>\\nint main() { std::cout << \"Hello!\" << std::endl; return 0; }",
      "language": "c++17",
      "optimization": "O2"
    }
  }
}' | docker exec -i llvm-mcp-server node dist/index.js
```

### Generate AST
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_ast",
    "arguments": {
      "source_code": "int main() { return 42; }",
      "format": "dump"
    }
  }
}' | docker exec -i llvm-mcp-server node dist/index.js
```

### Alternative Script-Based Testing
For convenience, you can also use the provided scripts:

```bash
# Connect to running server for interactive testing
./scripts/connect-mcp-server.sh

# Run comprehensive tests with MCP Inspector
./scripts/test-mcp-docker.sh
```

## MCP Client Configuration

### Claude Desktop
Add to your `~/.claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "llvm-mcp-server": {
      "command": "docker",
      "args": ["exec", "-i", "llvm-mcp-server", "node", "dist/index.js"],
      "env": {}
    }
  }
}
```

### Using with MCP Inspector
The server includes built-in support for MCP Inspector testing:
```bash
npm test
```

This will automatically:
1. Start the MCP server container if not running
2. Run comprehensive functionality tests
3. Launch MCP Inspector for interactive testing

#### Manual Inspector Setup
If you need to set up MCP Inspector manually:

```bash
# Create wrapper script
cat > /tmp/mcp-docker-wrapper.sh << 'EOF'
#!/bin/bash
docker exec -i llvm-mcp-server node dist/index.js
EOF

chmod +x /tmp/mcp-docker-wrapper.sh

# Start Inspector
npx @modelcontextprotocol/inspector /tmp/mcp-docker-wrapper.sh
```

## Container Architecture

- **Base**: node:lts-alpine with LLVM/Clang 20.1.8
- **Security**: Non-root user, read-only filesystem, no network access
- **Resources**: 2 CPU cores max, 1GB RAM limit, 500MB temp storage
- **Isolation**: Complete sandboxing of all compilation processes

## Security Features

All compilation and analysis occurs in isolated Docker containers with:
- No network access during compilation
- Limited filesystem access (read-only source, write-only temp)
- Resource limits preventing system exhaustion
- Input sanitization and output filtering
- Process execution timeout protection

## Docker-Only Architecture

This project has been specifically designed to run **exclusively in Docker containers**, eliminating all host dependencies.

### Migration from Local Dependencies

**Before (Local Dependencies):**
- Required Node.js 22+ on host machine
- Required LLVM/Clang installation on host
- Local npm dependencies and build process
- Direct `node` command execution

**After (Docker-Only):**
- **Only Docker required** on host machine
- All dependencies containerized
- All operations through `npm` scripts that manage Docker
- Complete isolation and security

### Benefits of Docker-Only Approach

1. **Zero Host Dependencies**: No need for Node.js or LLVM installation
2. **Complete Isolation**: Secure sandboxing of all operations
3. **Consistent Environment**: Same behavior across different systems
4. **Easy Deployment**: Single command startup and management
5. **Resource Control**: Built-in resource limits and monitoring
6. **Enhanced Security**: Complete isolation of compilation processes

### Container Architecture Details

- **Base Image**: node:lts-alpine + LLVM/Clang 20.1.8
- **Security**: Non-root `compiler` user for all operations
- **Filesystem**: Read-only with designated temporary compilation areas
- **Network**: Completely isolated (no external access during compilation)
- **Resources**: CPU and memory limits enforced at container level
- **Build Modes**: Unified Dockerfile supports both development and production builds

### File Structure for Docker-Only Approach

- **Excluded**: `dist/`, `node_modules/` from repository (generated in containers)
- **Docker-focused**: All documentation emphasizes containerized usage
- **Automated Scripts**: Docker management through npm scripts
- **Unified Configuration**: Single docker-compose.yml with profiles

## Troubleshooting

### Container Issues
```bash
# Check container status
npm run status

# View detailed logs
npm run logs

# Restart if needed
npm stop && npm start
```

### Connection Problems
```bash
# Test basic connectivity
docker exec llvm-mcp-server echo "Container is running"

# Test MCP server directly
npm run connect

# Alternative direct testing
docker exec -it llvm-mcp-server sh
node dist/index.js --version
```

### Container Not Starting
```bash
# Check if ports are in use
docker ps -a
npm stop
npm start

# Check Docker logs
docker logs llvm-mcp-server
```

### Verification After Setup
After starting the server, verify everything works correctly:

```bash
# 1. Start the server
npm start

# 2. Test basic functionality
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker exec -i llvm-mcp-server node dist/index.js

# 3. Run comprehensive tests
npm test

# 4. Stop when done
npm stop
```

This ensures the LLVM MCP Server runs reliably in any environment with Docker, providing consistent behavior and enhanced security through complete containerization.

## License

MIT