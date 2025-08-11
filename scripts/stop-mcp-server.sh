#!/bin/bash

# Stop LLVM MCP Server using Docker Compose

set -e

echo "🛑 Stopping LLVM MCP Server..."

# Stop all services using Docker Compose
echo "Stopping Docker Compose services..."
docker compose down

# Check for any remaining containers
if docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "⚠️  Some containers are still running. Force stopping..."
    docker stop llvm-mcp-server 2>/dev/null || true
    docker rm llvm-mcp-server 2>/dev/null || true
fi

# Clean up any inspector containers
docker stop mcp-inspector 2>/dev/null || true
docker rm mcp-inspector 2>/dev/null || true
docker stop mcp-inspector-standalone 2>/dev/null || true
docker rm mcp-inspector-standalone 2>/dev/null || true

echo "✅ MCP Server stopped and cleaned up successfully"

echo ""
echo "📋 Remaining containers:"
docker ps -a -f name=llvm-mcp-server -f name=mcp-inspector --format "table {{.Names}}\t{{.Status}}" || echo "No MCP-related containers found"