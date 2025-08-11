#!/bin/bash

# Docker Compose command helpers for LLVM MCP Server

set -e

COMMAND=${1:-help}

case "$COMMAND" in
    "start"|"up")
        echo "🐳 Starting MCP Server..."
        docker compose up -d mcp-server
        echo "✅ Started successfully"
        docker compose ps
        ;;
    
    "stop"|"down")
        echo "🛑 Stopping all services..."
        docker compose down
        echo "✅ Stopped successfully"
        ;;
    
    "restart")
        echo "🔄 Restarting MCP Server..."
        docker compose restart mcp-server
        echo "✅ Restarted successfully"
        ;;
    
    "logs")
        echo "📋 Showing MCP Server logs..."
        docker compose logs -f mcp-server
        ;;
    
    "status"|"ps")
        echo "📊 Service Status:"
        docker compose ps
        ;;
    
    "build")
        echo "🔨 Building MCP Server image..."
        docker compose build mcp-server
        echo "✅ Built successfully"
        ;;
    
    "rebuild")
        echo "🔨 Rebuilding MCP Server..."
        docker compose build --no-cache mcp-server
        docker compose up -d mcp-server
        echo "✅ Rebuilt and restarted successfully"
        ;;
    
    "inspector")
        echo "🧪 Starting MCP Inspector..."
        docker compose --profile inspector up -d
        echo "✅ Inspector started. Check ports 6274 and 6277"
        ;;
    
    "inspector-standalone")
        echo "🧪 Starting standalone MCP Inspector..."
        docker compose --profile inspector-standalone up -d
        echo "✅ Standalone inspector started"
        ;;
    
    "dev")
        echo "🛠️  Starting development environment..."
        docker compose --profile dev up -d
        echo "✅ Development server started with volume mounts"
        ;;
    
    "worker")
        echo "⚙️  Starting compilation worker..."
        docker compose --profile worker up -d
        echo "✅ Compilation worker started"
        ;;
    
    "clean")
        echo "🧹 Cleaning up Docker resources..."
        docker compose down -v --remove-orphans
        docker system prune -f
        echo "✅ Cleaned up successfully"
        ;;
    
    "test")
        echo "🧪 Running comprehensive tests..."
        ./scripts/test-mcp-docker.sh
        ;;
    
    "connect")
        echo "🔗 Connecting to MCP Server..."
        ./scripts/connect-mcp-server.sh
        ;;
    
    "help"|*)
        echo "LLVM MCP Server - Docker Compose Commands"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Available commands:"
        echo "  start, up          Start the MCP server"
        echo "  stop, down         Stop all services"
        echo "  restart            Restart the MCP server"
        echo "  logs               Show server logs (follow)"
        echo "  status, ps         Show service status"
        echo "  build              Build the MCP server image"
        echo "  rebuild            Rebuild and restart (no cache)"
        echo "  inspector          Start MCP Inspector for testing"
        echo "  inspector-standalone  Start standalone inspector"
        echo "  dev                Start development environment"
        echo "  worker             Start compilation worker"
        echo "  clean              Clean up all Docker resources"
        echo "  test               Run comprehensive tests"
        echo "  connect            Connect to running server"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start           # Start the MCP server"
        echo "  $0 logs            # View server logs"
        echo "  $0 inspector       # Test with MCP Inspector"
        echo "  $0 clean           # Clean up everything"
        ;;
esac