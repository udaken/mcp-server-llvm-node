# Unified Dockerfile for LLVM MCP Server
# Supports both development and production builds via build args
FROM node:lts-alpine

# Build arguments
ARG BUILD_MODE=development

# Install LLVM/Clang and build tools
RUN apk add --no-cache \
    clang \
    clang-dev \
    clang-extra-tools \
    llvm \
    llvm-dev \
    build-base \
    musl-dev \
    linux-headers \
    && rm -rf /var/cache/apk/*

# Verify LLVM/Clang installation
RUN clang --version && llvm-config --version

# Create a non-root user for compilation
RUN addgroup -g 1001 -S compiler && \
    adduser -S compiler -u 1001 -G compiler -s /bin/sh

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies based on build mode
RUN if [ "$BUILD_MODE" = "production" ]; then \
        # Production: Install all deps, build, then remove dev deps \
        npm ci && \
        echo "Installing production dependencies..."; \
    else \
        # Development: Just install all dependencies \
        npm ci && \
        echo "Installing development dependencies..."; \
    fi

# Copy source and build (production only)
COPY src/ ./src/
RUN if [ "$BUILD_MODE" = "production" ]; then \
        npm run build && \
        rm -rf src/ node_modules/ && \
        npm ci --omit=dev && \
        npm cache clean --force; \
    fi

# Create directories for temporary compilation
RUN mkdir -p /tmp/mcp-compilation /tmp/compilation /app/tmp && \
    chown -R compiler:compiler /tmp/mcp-compilation /tmp/compilation /app

# Switch to non-root user
USER compiler

# Set environment variables
ENV CC=clang
ENV CXX=clang++
ENV PATH=/usr/bin:$PATH
ENV NODE_ENV=${BUILD_MODE}
ENV MCP_SERVER_MODE=stdio

# Health check (production only)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD if [ "$BUILD_MODE" = "production" ]; then \
            echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | node dist/index.js --health-check || exit 1; \
        else \
            exit 0; \
        fi

# Expose port for potential SSE transport
EXPOSE 3000

# Default command based on build mode
CMD if [ "$BUILD_MODE" = "production" ]; then \
        node dist/index.js; \
    else \
        /bin/sh; \
    fi
