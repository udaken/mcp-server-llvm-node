#!/bin/bash

# Claude Desktop MCP Server Wrapper Script
# This script provides a bridge between Claude Desktop and the dockerized MCP server

# Navigate to project directory
cd "$(dirname "$0")/.."

# Option A: Use docker compose run (recommended)
# This creates a new container instance for each connection
exec docker compose run --rm -i mcp-server node dist/index.js

# Option B: Use docker exec (uncomment to use this instead)
# This requires a pre-running container but is faster
# exec docker exec -i llvm-mcp-server node dist/index.js

# Option C: Ensure container is running, then exec
# This automatically starts the container if needed, then uses exec
# docker compose up -d mcp-server >/dev/null 2>&1
# exec docker exec -i llvm-mcp-server node dist/index.js