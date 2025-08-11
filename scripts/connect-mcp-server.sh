#!/bin/bash

# Connect to running LLVM MCP Server for direct interaction

set -e

echo "🔗 Connecting to LLVM MCP Server in Docker..."

# Check if container is running
if ! docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "❌ MCP server container is not running"
    echo "Please start it first: ./scripts/start-mcp-server.sh"
    exit 1
fi

echo "✅ Connected to MCP server. Send JSON-RPC messages:"
echo "Example: {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
echo "Press Ctrl+C to disconnect"
echo ""

# Connect to the running container's stdin/stdout
docker exec -i llvm-mcp-server node dist/index.js