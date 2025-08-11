@echo off
REM Claude Desktop MCP Server Wrapper Script for Windows
REM This script provides a bridge between Claude Desktop and the dockerized MCP server

REM Navigate to project directory
cd /d "%~dp0\.."

REM Use docker compose run (recommended for Windows)
docker compose run --rm -i mcp-server node dist/index.js