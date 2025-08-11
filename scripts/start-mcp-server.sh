#!/bin/bash

# Start LLVM MCP Server using Docker Compose
# This script allows running the MCP server without Node.js installed on the host

set -e

echo "🐳 Starting LLVM MCP Server with Docker Compose..."

# Check if container is already running
if docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "⚠️  Container llvm-mcp-server is already running"
    echo "Stopping existing services..."
    docker compose down
fi

# Start the MCP server with Docker Compose
echo "Building and starting MCP server..."
docker compose up -d mcp-server

echo "✅ MCP Server started successfully!"
echo ""
echo "Container Information:"
docker compose ps

echo ""
echo "📋 Usage:"
echo "  Connect via stdin/stdout: docker exec -i llvm-mcp-server node dist/index.js"
echo "  View logs: docker compose logs -f mcp-server"
echo "  Stop server: docker compose down"
echo "  Test with Inspector: ./scripts/test-mcp-docker.sh"

# Wait for container to be healthy
echo "Waiting for server to be ready..."
timeout=30
while [ $timeout -gt 0 ] && ! docker exec llvm-mcp-server node dist/index.js --help 2>/dev/null; do
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
    echo "⚠️  Server may not be fully ready yet. Check logs with: docker compose logs mcp-server"
else
    echo "🎉 Server is ready to accept connections!"
fi