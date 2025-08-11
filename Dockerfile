# Use Node.js LTS Alpine as base image
FROM node:lts-alpine

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

# Set up working directories
WORKDIR /workspace
RUN chown compiler:compiler /workspace

# Create directories for source and output
RUN mkdir -p /tmp/compilation && \
    chown compiler:compiler /tmp/compilation

# Switch to non-root user
USER compiler

# Set environment variables
ENV CC=clang
ENV CXX=clang++
ENV PATH=/usr/bin:$PATH

# Default command (will be overridden)
CMD ["/bin/sh"]