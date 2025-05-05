#!/bin/bash
set -e

# Get environment or default to development
ENV=${1:-development}

echo "Starting server in $ENV mode..."

if [ "$ENV" = "production" ]; then
  # Run in production mode - use the build output
  echo "Starting production server..."
  cd dist && NODE_ENV=production node server-start.js
else
  # Run in development mode
  echo "Starting development server..."
  NODE_ENV=development tsx server/index.ts
fi
