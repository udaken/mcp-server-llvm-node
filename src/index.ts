#!/usr/bin/env node

import { LLVMMCPServer } from './server.js';

async function main(): Promise<void> {
  try {
    const server = new LLVMMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start LLVM MCP Server:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});