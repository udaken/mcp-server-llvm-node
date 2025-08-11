#!/bin/bash

# Test LLVM MCP Server running in Docker with MCP Inspector

set -e

echo "🧪 Testing MCP Server in Docker with Inspector..."

# Check if MCP server container is running
if ! docker ps -q -f name=llvm-mcp-server | grep -q .; then
    echo "❌ MCP server container is not running"
    echo "Please start it first: ./scripts/start-mcp-server.sh"
    exit 1
fi

echo "✅ MCP server container is running"

# Test basic MCP server functionality
echo ""
echo "🔍 Testing MCP server basic functionality..."

# Test tools list
echo "Testing tools/list..."
TOOLS_RESULT=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | docker exec -i llvm-mcp-server node dist/index.js | head -1)

if echo "$TOOLS_RESULT" | grep -q '"tools"'; then
    echo "✅ Tools list working"
else
    echo "❌ Tools list failed"
    echo "Response: $TOOLS_RESULT"
fi

# Test resources list
echo "Testing resources/list..."
RESOURCES_RESULT=$(echo '{"jsonrpc": "2.0", "id": 2, "method": "resources/list", "params": {}}' | docker exec -i llvm-mcp-server node dist/index.js | head -1)

if echo "$RESOURCES_RESULT" | grep -q '"resources"'; then
    echo "✅ Resources list working"
else
    echo "❌ Resources list failed"
    echo "Response: $RESOURCES_RESULT"
fi

# Test compilation
echo "Testing compile_cpp tool..."
COMPILE_JSON=$(cat <<'EOF'
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "compile_cpp",
    "arguments": {
      "source_code": "#include <iostream>\\nint main() { std::cout << \"Hello from Docker!\" << std::endl; return 0; }",
      "language": "c++17",
      "optimization": "O2"
    }
  }
}
EOF
)

COMPILE_RESULT=$(echo "$COMPILE_JSON" | docker exec -i llvm-mcp-server node dist/index.js | head -1)

if echo "$COMPILE_RESULT" | grep -q '"success"'; then
    echo "✅ Compilation test working"
else
    echo "❌ Compilation test failed"
    echo "Response: $COMPILE_RESULT"
fi

echo ""
echo "🚀 Starting MCP Inspector to test interactively..."
echo "Note: Inspector will connect to the containerized MCP server"

# Check if Inspector is available
if ! command -v npx >/dev/null 2>&1; then
    echo "❌ npx not found. Please install Node.js to run MCP Inspector"
    echo "Alternatively, you can test manually with:"
    echo "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}' | docker exec -i llvm-mcp-server node dist/index.js"
    exit 0
fi

# Create a wrapper script for Inspector to connect to Docker
cat > /tmp/mcp-docker-wrapper.sh << 'EOF'
#!/bin/bash
docker exec -i llvm-mcp-server node dist/index.js
EOF

chmod +x /tmp/mcp-docker-wrapper.sh

echo "Starting Inspector..."
npx @modelcontextprotocol/inspector /tmp/mcp-docker-wrapper.sh

# Cleanup
rm -f /tmp/mcp-docker-wrapper.sh