#!/bin/bash
echo "🚀 Preparing to run Careerate in production mode..."

# Use port 8000 for production to avoid conflicts with development server on port 5000
export PORT=8000

# Start the production server
echo "🚀 Starting production server on port $PORT..."
cd dist && NODE_ENV=production node server-start.js
