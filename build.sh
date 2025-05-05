#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Make build script executable
chmod +x server-build.js

# Installing dependencies
echo "Installing dependencies..."
npm install

# Run the simplified server build script
echo "Running server build script..."
node server-build.js

echo "=============== BUILD COMPLETE ==============="