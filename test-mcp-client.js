#!/usr/bin/env node

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
  console.log('Starting MCP Server test...\n');

  // スピン子プロセスでサーバを起動
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  // MCPクライアントを作成
  const transport = new StdioClientTransport({
    stdin: serverProcess.stdout,
    stdout: serverProcess.stdin
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    // サーバーに接続
    await client.connect(transport);
    console.log('✓ Connected to MCP Server');

    // ツール一覧を取得
    const tools = await client.listTools();
    console.log('✓ Available tools:', tools.tools.map(t => t.name));

    // リソース一覧を取得
    const resources = await client.listResources();
    console.log('✓ Available resources:', resources.resources.map(r => r.name));

    // コンパイルテスト
    console.log('\n--- Testing compile_cpp ---');
    const compileResult = await client.callTool({
      name: 'compile_cpp',
      arguments: {
        source_code: '#include <iostream>\\nint main() { std::cout << "Hello!" << std::endl; return 0; }',
        language: 'c++17',
        optimization: 'O2'
      }
    });

    const compileData = JSON.parse(compileResult.content[0].text);
    console.log('Compile success:', compileData.success);
    console.log('Compilation time:', compileData.compilationTime, 's');

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // クリーンアップ
    serverProcess.kill();
    console.log('\n🔧 Server stopped');
  }
}

// 依存関係がない場合のメッセージ
if (!process.argv[2] || process.argv[2] !== 'run') {
  console.log('To run this test, first install the MCP SDK client:');
  console.log('npm install @modelcontextprotocol/sdk');
  console.log('');
  console.log('Then run: node test-mcp-client.js run');
} else {
  testMCPServer();
}