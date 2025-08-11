#!/bin/bash

# Build Docker image for LLVM MCP Server
set -e

echo "Building LLVM MCP Server Docker image..."

# Build the main Docker image
docker build -t llvm-mcp-server:latest .

echo "Docker image built successfully!"

# Verify LLVM/Clang installation
echo "Verifying LLVM/Clang installation..."
docker run --rm llvm-mcp-server:latest clang --version
docker run --rm llvm-mcp-server:latest llvm-config --version

echo "Build complete!"