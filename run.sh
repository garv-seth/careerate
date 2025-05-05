#!/bin/bash
echo "🚀 Preparing to run Careerate in production mode..."

# Check if any server is running on port 5000
if lsof -t -i:5000 > /dev/null; then
  echo "⚠️ Port 5000 is already in use. Stopping existing processes..."
  kill $(lsof -t -i:5000) || true
  
  # Wait a moment for the port to be released
  sleep 2
  
  # Double-check port is free
  if lsof -t -i:5000 > /dev/null; then
    echo "❌ Error: Port 5000 is still in use. Could not start server."
    exit 1
  fi
fi

# Start the production server
echo "🚀 Starting production server..."
cd dist && NODE_ENV=production node server-start.js
