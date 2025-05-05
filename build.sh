#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Install production dependencies
echo "Installing dependencies..."
npm install

# Build the application using minimal approach
echo "Building application..."
./minimal-build.sh

echo "=============== BUILD COMPLETE ==============="