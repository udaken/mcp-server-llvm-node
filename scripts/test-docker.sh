#!/bin/bash

# Test Docker environment with a simple C++ compilation
set -e

echo "Testing Docker environment with sample C++ code..."

# Create a simple test C++ program
TEST_CODE='#include <iostream>
int main() {
    std::cout << "Hello, LLVM MCP Server!" << std::endl;
    return 0;
}'

# Create temporary directory and file
TMP_DIR=$(mktemp -d)
echo "$TEST_CODE" > "$TMP_DIR/main.cpp"

echo "Compiling test program in Docker container..."

# Test compilation in Docker
docker run --rm \
  -v "$TMP_DIR:/workspace" \
  -w /workspace \
  -u compiler \
  llvm-mcp-server:latest \
  clang++ -std=c++17 -O2 -o test main.cpp

echo "Testing execution..."
docker run --rm \
  -v "$TMP_DIR:/workspace" \
  -w /workspace \
  -u compiler \
  llvm-mcp-server:latest \
  ./test

echo "Testing AST generation..."
docker run --rm \
  -v "$TMP_DIR:/workspace" \
  -w /workspace \
  -u compiler \
  llvm-mcp-server:latest \
  clang -Xclang -ast-dump -fsyntax-only main.cpp

# Clean up
rm -rf "$TMP_DIR"

echo "Docker environment test completed successfully!"