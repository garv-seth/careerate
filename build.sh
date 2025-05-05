#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Install production dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
NODE_ENV=production npm run build

echo "=============== BUILD COMPLETE ==============="