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

- **Docker**: Version 20.0.0 or higher with Docker Compose support
- **No Node.js, LLVM, or other dependencies required on host machine**
- **Operating System**: Linux, macOS, or Windows with Docker Desktop

## Quick Start

### Method 1: Using Docker Compose (Recommended)

```bash
# Start the MCP server
docker compose up -d mcp-server

# Test basic functionality
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker exec -i llvm-mcp-server node dist/index.js

# View logs
docker compose logs -f mcp-server

# Stop the server
docker compose down
```

### Method 2: Using Shell Scripts (Convenience Wrappers)

For convenience, shell scripts are provided as Docker command wrappers:

```bash
# Start the MCP server (runs Docker Compose internally)
./scripts/start-mcp-server.sh

# Test the server
./scripts/test-mcp-docker.sh

# Connect interactively
./scripts/connect-mcp-server.sh

# View logs and status
docker compose logs -f mcp-server
docker compose ps

# Stop the server
./scripts/stop-mcp-server.sh
```

> **Note**: Shell scripts are convenience wrappers that execute Docker/Docker Compose commands. No Node.js installation is required on the host.

## Available Commands

### Docker Compose Commands (Primary Method)

| Command | Description |
|---------|-------------|
| `docker compose up -d mcp-server` | Build and start the MCP server |
| `docker compose down` | Stop and remove all containers |
| `docker compose logs -f mcp-server` | View server logs in real-time |
| `docker compose ps` | Check container status |
| `docker compose build --no-cache mcp-server` | Rebuild Docker image |
| `docker compose --profile inspector up -d` | Start with MCP Inspector |
| `docker compose --profile dev up -d` | Start development environment |

### Shell Script Wrappers

Convenience scripts that execute Docker commands:

| Script | Description | Underlying Docker Command |
|--------|-------------|---------------------------|
| `./scripts/start-mcp-server.sh` | Start MCP server | `docker compose up -d mcp-server` |
| `./scripts/stop-mcp-server.sh` | Stop server | `docker compose down` |
| `./scripts/connect-mcp-server.sh` | Connect interactively | Direct Docker exec commands |
| `./scripts/test-mcp-docker.sh` | Run comprehensive tests | MCP Inspector with Docker wrapper |
| `./scripts/docker-compose-commands.sh` | All operations helper | Various Docker Compose commands |

### Docker Compose Helper

The `./scripts/docker-compose-commands.sh` script provides comprehensive Docker operations:

```bash
# Usage examples
./scripts/docker-compose-commands.sh start      # Start MCP server
./scripts/docker-compose-commands.sh stop       # Stop all services  
./scripts/docker-compose-commands.sh inspector  # Start with Inspector
./scripts/docker-compose-commands.sh dev        # Start development environment
./scripts/docker-compose-commands.sh logs       # Show logs
./scripts/docker-compose-commands.sh clean      # Clean up resources
```

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

#### Step 1: Choose Configuration Method

**For Option 1 (docker exec)**: Start the MCP server first:
```bash
# Start the MCP server in Docker
docker compose up -d mcp-server

# Verify it's running
docker compose ps
```

**For Option 2 (docker compose run)**: No pre-startup required - containers will be created automatically when Claude Desktop connects.

**For Option 3 (shell script)**: Create a wrapper script (see Advanced Configuration Options below).

#### Step 2: Configure Claude Desktop
Add the following configuration to your Claude Desktop config file:

**Location of config file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

**Configuration for stdio mode:**

**Option 1: Using docker exec (requires running container):**
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

**Option 2: Using docker compose run (recommended):**
```json
{
  "mcpServers": {
    "llvm-mcp-server": {
      "command": "docker",
      "args": ["compose", "run", "--rm", "-i", "mcp-server", "node", "dist/index.js"],
      "env": {},
      "cwd": "/path/to/mcp-server-llvm-node"
    }
  }
}
```

Replace `/path/to/mcp-server-llvm-node` with the absolute path to your project directory.

**Option 3: Using shell script wrapper:**
```json
{
  "mcpServers": {
    "llvm-mcp-server": {
      "command": "/path/to/mcp-server-llvm-node/scripts/claude-mcp-wrapper.sh",
      "args": [],
      "env": {}
    }
  }
}
```

#### Step 3: Restart Claude Desktop
After saving the configuration file, restart Claude Desktop to apply the changes.

#### Step 4: Verify Connection
Once restarted, Claude Desktop should automatically connect to your MCP server. You can verify this by:
1. Opening a new conversation in Claude Desktop
2. Looking for the MCP server indicator in the Claude Desktop interface
3. The MCP tools should be available: `compile_cpp`, `analyze_cpp`, `get_ast`
4. Resources should be available: `llvm://standards`, `llvm://compiler-info`, `llvm://checkers`

If the connection fails, check:
- The MCP server container is running: `docker compose ps`
- Container logs: `docker compose logs mcp-server`
- Claude Desktop logs for connection errors

#### Troubleshooting Claude Desktop Connection

**Common Issues:**

1. **Container not running**
   ```bash
   # Check if container is running
   docker compose ps
   
   # Start if not running
   docker compose up -d mcp-server
   ```

2. **Permission issues on Windows**
   - Ensure Docker Desktop is running
   - Try running Claude Desktop as Administrator

3. **Path issues**
   - Use absolute paths if relative paths don't work
   - On Windows, use forward slashes in JSON: `"C:/path/to/project"`

4. **Connection timeout**
   ```bash
   # Test manual connection
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i llvm-mcp-server node dist/index.js
   ```

#### Configuration Method Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **docker exec** | Fast, uses existing container | Requires pre-started container | Development with long-running server |
| **docker compose run** | Auto-starts, isolated sessions | Slower startup, creates new containers | Production, reliable connections |
| **shell script** | Most flexible, custom logic | Additional maintenance | Complex setups, custom environments |

#### Advanced Configuration Options

**Create a wrapper script for Option 3** (`scripts/claude-mcp-wrapper.sh`):
```bash
#!/bin/bash

# Navigate to project directory
cd "$(dirname "$0")/.."

# Option A: Use docker compose run (recommended)
exec docker compose run --rm -i mcp-server node dist/index.js

# Option B: Use docker exec (uncomment to use this instead)
# exec docker exec -i llvm-mcp-server node dist/index.js

# Option C: Ensure container is running, then exec
# docker compose up -d mcp-server >/dev/null 2>&1
# exec docker exec -i llvm-mcp-server node dist/index.js
```

Make the script executable:
```bash
chmod +x scripts/claude-mcp-wrapper.sh
```

#### Windows-Specific Configuration

For Windows users, you may need to create a `.bat` file instead:

**Create `scripts/claude-mcp-wrapper.bat`:**
```batch
@echo off
cd /d "%~dp0\.."
docker compose run --rm -i mcp-server node dist/index.js
```

**Windows Claude Desktop configuration:**
```json
{
  "mcpServers": {
    "llvm-mcp-server": {
      "command": "C:/path/to/mcp-server-llvm-node/scripts/claude-mcp-wrapper.bat",
      "args": [],
      "env": {}
    }
  }
}
```

### Using with MCP Inspector
The server includes built-in support for MCP Inspector testing:
```bash
./scripts/test-mcp-docker.sh
```

This will automatically:
1. Start the MCP server container if not running
2. Run comprehensive functionality tests
3. Launch containerized MCP Inspector for interactive testing (preferred)
4. Fallback to host-based Inspector if containerized version fails

#### Manual Inspector Setup
If you need to set up MCP Inspector manually (requires Node.js only for Inspector UI):

```bash
# Start MCP Inspector profile (includes Inspector container)
docker compose --profile inspector up -d

# Or create wrapper script for external Inspector
cat > /tmp/mcp-docker-wrapper.sh << 'EOF'
#!/bin/bash
docker exec -i llvm-mcp-server node dist/index.js
EOF

chmod +x /tmp/mcp-docker-wrapper.sh

# Start Inspector (requires Node.js on host for Inspector UI only)
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

## Docker-First Architecture

This project is designed to run **exclusively in Docker containers**, eliminating all host dependencies through a comprehensive Docker-first approach.

### Complete Containerization

**Host Machine Requirements:**
- Docker with Docker Compose support only
- No Node.js, LLVM, Clang, or other development tools needed

**Container-Based Execution:**
- All compilation and analysis occurs in isolated containers
- TypeScript build process runs inside containers
- MCP server communication through Docker exec
- Multi-profile Docker Compose configuration for different use cases

### Docker Compose Profiles

The project uses Docker Compose profiles for different deployment scenarios:

- **Production** (`mcp-server`): Hardened container with minimal privileges
- **Development** (`dev`): Volume mounts for live code editing
- **Inspector** (`inspector`): MCP Inspector for interactive testing
- **Worker** (`worker`): Dedicated compilation worker containers

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

### Docker-First File Structure

```
├── docker-compose.yml          # Unified Docker Compose configuration
├── Dockerfile                  # Multi-stage build (dev/production)
├── scripts/
│   ├── docker-compose-commands.sh  # Docker Compose helper
│   ├── start-mcp-server.sh     # Server startup
│   ├── stop-mcp-server.sh      # Server shutdown
│   ├── test-mcp-docker.sh      # Testing suite
│   └── connect-mcp-server.sh   # Interactive connection
├── src/                        # TypeScript source (built in container)
├── package.json                # npm scripts as Docker wrappers
└── README.md                   # Docker-focused documentation
```

**Generated in Containers Only:**
- `dist/` - TypeScript compilation output
- `node_modules/` - npm dependencies
- Temporary compilation artifacts

## Troubleshooting

### Container Issues
```bash
# Check container status
docker compose ps

# View detailed logs
docker compose logs -f mcp-server

# Restart if needed
docker compose restart mcp-server

# Alternative using scripts
./scripts/docker-compose-commands.sh status
./scripts/docker-compose-commands.sh logs
./scripts/docker-compose-commands.sh restart
```

### Connection Problems
```bash
# Test basic connectivity
docker exec llvm-mcp-server echo "Container is running"

# Test MCP server directly
./scripts/connect-mcp-server.sh

# Alternative direct testing
docker exec -it llvm-mcp-server sh
node dist/index.js --version
```

### Container Not Starting
```bash
# Check container status and logs
docker compose ps
docker compose logs mcp-server

# Clean restart
docker compose down
docker compose up -d mcp-server

# Alternative with scripts
./scripts/stop-mcp-server.sh
./scripts/start-mcp-server.sh

# Check for port conflicts
docker ps -a
```

### Verification After Setup
After starting the server, verify everything works correctly:

#### Method 1: Docker Compose
```bash
# 1. Start the server
docker compose up -d mcp-server

# 2. Test basic functionality
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker exec -i llvm-mcp-server node dist/index.js

# 3. Run comprehensive tests
./scripts/test-mcp-docker.sh

# 4. Stop when done
docker compose down
```

#### Method 2: Shell Scripts
```bash
# 1. Start the server
./scripts/start-mcp-server.sh

# 2. Test basic functionality
./scripts/test-mcp-docker.sh

# 3. Connect interactively
./scripts/connect-mcp-server.sh

# 4. Stop when done
./scripts/stop-mcp-server.sh
```

This Docker-first approach ensures the LLVM MCP Server runs reliably in any environment, providing consistent behavior and enhanced security through complete containerization.

## License

MIT