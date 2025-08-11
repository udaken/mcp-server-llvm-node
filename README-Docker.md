# Docker-based LLVM MCP Server

This document explains how to run the LLVM MCP Server in Docker without requiring Node.js on the host machine.

## Quick Start

### 1. Start MCP Server in Docker
```bash
./scripts/start-mcp-server.sh
```

### 2. Test the Server
```bash
# Test basic functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | docker exec -i llvm-mcp-server node dist/index.js

# Connect interactively
./scripts/connect-mcp-server.sh

# Test with MCP Inspector (requires Node.js on host)
./scripts/test-mcp-docker.sh
```

### 3. Stop the Server
```bash
./scripts/stop-mcp-server.sh
```

## Usage Examples

### List Available Tools
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i llvm-mcp-server node dist/index.js
```

### Compile C++ Code
```bash
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

## Configuration for MCP Clients

### Claude Desktop Configuration
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

## Available Scripts

- `./scripts/start-mcp-server.sh` - Build and start the MCP server container
- `./scripts/stop-mcp-server.sh` - Stop and remove the MCP server container  
- `./scripts/connect-mcp-server.sh` - Connect to running server for interactive testing
- `./scripts/test-mcp-docker.sh` - Run comprehensive tests with MCP Inspector

## Container Details

- **Base Image**: node:lts-alpine with LLVM/Clang 20.1.8
- **Security**: Non-root user, read-only filesystem, no network access
- **Resource Limits**: 2 CPU cores, 1GB RAM, 500MB temp storage
- **Health Check**: Built-in health monitoring

## Advantages

1. **No Host Dependencies**: No need to install Node.js or LLVM on host machine
2. **Isolation**: Complete sandboxing of compilation processes
3. **Security**: Hardened container with minimal privileges
4. **Portability**: Runs consistently across different environments
5. **Resource Control**: Built-in limits prevent resource exhaustion

## Troubleshooting

### Check Container Status
```bash
docker ps -f name=llvm-mcp-server
docker logs llvm-mcp-server
```

### Container Not Starting
```bash
# Check if ports are in use
docker ps -a
./scripts/stop-mcp-server.sh
./scripts/start-mcp-server.sh
```

### Connection Issues
```bash
# Test basic connectivity
docker exec llvm-mcp-server echo "test"

# Check MCP server directly
docker exec -it llvm-mcp-server sh
node dist/index.js --version
```