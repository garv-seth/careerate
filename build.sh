#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Install production dependencies
echo "Installing dependencies..."
npm install

# Build the server only - simpler approach
echo "Building server application..."
NODE_ENV=production node build-server.js

echo "=============== BUILD COMPLETE ==============="