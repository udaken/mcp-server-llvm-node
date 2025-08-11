#!/bin/bash

echo "Testing LLVM MCP Server via stdio..."
echo ""

# サーバーを起動してJSONメッセージを送信
node dist/index.js << 'EOF' | head -20
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}
{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "id": 3, "method": "resources/list", "params": {}}
EOF

echo ""
echo "If you see JSON responses above, the MCP server is working correctly!"
echo ""
echo "To test with MCP Inspector:"
echo "npx @modelcontextprotocol/inspector node dist/index.js"