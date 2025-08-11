#!/bin/bash

# Start LLVM MCP Server in Docker Container
# This script allows running the MCP server without Node.js installed on the host

set -e

echo "🐳 Starting LLVM MCP Server in Docker..."

# Build the MCP server image
echo "Building MCP server image..."
docker build -f Dockerfile.mcp-server -t llvm-mcp-server:latest .

# Check if container is already running
if docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "⚠️  Container llvm-mcp-server is already running"
    echo "Stopping existing container..."
    docker stop llvm-mcp-server
    docker rm llvm-mcp-server
fi

# Start the MCP server container
echo "Starting MCP server container..."
docker run -d \
    --name llvm-mcp-server \
    --restart unless-stopped \
    --security-opt no-new-privileges:true \
    --cap-drop ALL \
    --cap-add DAC_OVERRIDE \
    --read-only \
    --tmpfs /tmp/mcp-compilation:noexec,nosuid,size=500m \
    --tmpfs /tmp:noexec,nosuid,size=100m \
    --cpus="2.0" \
    --memory="1g" \
    -i \
    llvm-mcp-server:latest

echo "✅ MCP Server started successfully!"
echo ""
echo "Container Information:"
docker ps -f name=llvm-mcp-server --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 Usage:"
echo "  Connect via stdin/stdout: docker exec -i llvm-mcp-server node dist/index.js"
echo "  View logs: docker logs -f llvm-mcp-server"
echo "  Stop server: docker stop llvm-mcp-server"
echo "  Test with Inspector: ./scripts/test-mcp-docker.sh"