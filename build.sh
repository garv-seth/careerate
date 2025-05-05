#!/bin/bash
set -e

echo "==================== DEPLOYMENT BUILD PROCESS ===================="

# Make build script executable
chmod +x build-script.js

# Installing dependencies
echo "Installing dependencies..."
npm install

# Run the build script
echo "Running build script..."
node build-script.js

echo "=============== BUILD COMPLETE ==============="