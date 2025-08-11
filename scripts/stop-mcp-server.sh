#!/bin/bash

# Stop LLVM MCP Server Docker Container

set -e

echo "🛑 Stopping LLVM MCP Server..."

# Check if container exists and is running
if docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "Stopping container..."
    docker stop llvm-mcp-server
    
    echo "Removing container..."
    docker rm llvm-mcp-server
    
    echo "✅ MCP Server stopped and removed successfully"
elif docker ps -a -q -f name=llvm-mcp-server | grep -q .; then
    echo "Container exists but is not running. Removing..."
    docker rm llvm-mcp-server
    echo "✅ MCP Server container removed"
else
    echo "⚠️  No MCP server container found"
fi

echo ""
echo "📋 Container status:"
docker ps -a -f name=llvm-mcp-server --format "table {{.Names}}\t{{.Status}}" || echo "No containers found"