#!/bin/bash
set -e

# Get environment or default to development
ENV=${1:-development}

echo "Starting server in $ENV mode..."

if [ "$ENV" = "production" ]; then
  # Run in production mode - use the bootstrap file
  echo "Starting production server..."
  node production-start.js
else
  # Run in development mode
  echo "Starting development server..."
  NODE_ENV=development tsx server/index.ts
fi
