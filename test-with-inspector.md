# MCP Inspector でのテスト方法

## 1. サーバーの起動（stdio モード）

```bash
# ビルドしてから実行
npm run build

# MCP Inspector でテスト
npx @modelcontextprotocol/inspector node dist/index.js
```

## 2. ブラウザでのインタラクション

Inspector を起動すると、ブラウザで MCP サーバーとのインタラクションが可能になります。

### 利用可能なツール

#### compile_cpp
```json
{
  "name": "compile_cpp",
  "arguments": {
    "source_code": "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
    "language": "c++17",
    "optimization": "O2",
    "warnings": "all"
  }
}
```

#### analyze_cpp
```json
{
  "name": "analyze_cpp",
  "arguments": {
    "source_code": "#include <iostream>\nint main() {\n    int x;\n    std::cout << x << std::endl;\n    return 0;\n}",
    "language": "c++17",
    "checkers": ["core.uninitialized.Assign"]
  }
}
```

#### get_ast
```json
{
  "name": "get_ast",
  "arguments": {
    "source_code": "int add(int a, int b) { return a + b; }",
    "language": "c++17",
    "format": "dump"
  }
}
```

### リソースの確認

利用可能なリソース:
- `llvm://standards` - サポートする言語標準
- `llvm://compiler-info` - コンパイラ情報
- `llvm://checkers` - 静的解析チェッカー