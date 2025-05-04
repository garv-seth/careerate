#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Make sure we're using the latest Node version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20 || true
nvm use 20 || true

node -v
npm -v

# Install production dependencies
echo "Installing dependencies..."
npm ci || npm install

# Build the application using our custom build script
echo "Building application..."
NODE_ENV=production ./custom-build.sh

# Verify build output
if [ -d "./dist" ]; then
  echo "Build successful. Checking build contents:"
  ls -la ./dist
else
  echo "ERROR: Build directory not found. Build may have failed."
  exit 1
fi

echo "=============== BUILD COMPLETE ==============="