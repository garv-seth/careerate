#!/bin/bash
set -e

echo "Running custom build process..."

# Run the standard build command
npm run build

# Enhanced post-build steps
echo "Performing post-build steps..."

# Make sure all necessary files are in the dist directory
mkdir -p dist/server

# Copy any non-TypeScript files that might be needed
echo "Copying necessary files to dist..."
cp -r server/setup-sessions.ts dist/server/ || echo "Warning: Could not copy setup-sessions.ts"

# Copy any static assets or config files
if [ -d "public" ]; then
  cp -r public dist/ || echo "Warning: Could not copy public folder"
fi

echo "Custom build completed successfully."