# LLVM MCP Server

An MCP (Model Context Protocol) server that provides C/C++ code compilation and analysis tools using LLVM/Clang toolchain in a secure Docker environment.

## Features

- **C/C++ Compilation**: Compile code with various optimization levels and language standards
- **Static Analysis**: Analyze code using Clang Static Analyzer
- **AST Generation**: Generate Abstract Syntax Trees in multiple formats
- **Security**: Sandboxed execution in Docker containers
- **Multiple Transports**: Support for stdio and SSE transports

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

## Tools

### compile_cpp
Compiles C/C++ source code with customizable options:
- Language standards (C89-C23, C++98-C++23)
- Optimization levels (O0, O1, O2, O3, Os, Oz, Ofast)
- Warning levels and custom flags
- Preprocessor definitions and include paths

### analyze_cpp
Performs static analysis on C/C++ code:
- Configurable checkers
- Security vulnerability detection
- Code quality analysis

### get_ast
Generates Abstract Syntax Trees:
- Multiple output formats (JSON, dump, Graphviz)
- Detailed syntax tree information

## Security

All compilation and analysis occurs in isolated Docker containers with:
- No network access
- Limited resource usage
- Temporary filesystem isolation
- Input sanitization and output filtering

## License

MIT