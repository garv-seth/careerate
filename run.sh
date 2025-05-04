#!/bin/bash
set -e

# Get environment or default to production in deployment context
if [ -z "$REPL_ENVIRONMENT" ] || [ "$REPL_ENVIRONMENT" == "production" ]; then
  ENV="production"
else
  ENV=${1:-development}
fi

echo "Starting server in $ENV mode..."

if [ "$ENV" = "production" ]; then
  # Make sure we have Node.js available
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use 20 || true
  
  echo "Node version: $(node -v)"
  echo "NPM version: $(npm -v)"
  
  # Check if dist directory exists, if not, build the app
  if [ ! -d "./dist" ] || [ ! -f "./dist/index.js" ]; then
    echo "Dist directory not found or incomplete. Building the application..."
    ./build.sh
  fi
  
  # Run in production mode
  echo "Starting production server..."
  NODE_ENV=production node dist/index.js
else
  # Run in development mode
  echo "Starting development server..."
  NODE_ENV=development tsx server/index.ts
fi
