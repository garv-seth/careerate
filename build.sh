#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build complete. Files in ./dist directory are ready for deployment."