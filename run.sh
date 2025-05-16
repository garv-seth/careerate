
#!/bin/bash
echo "🚀 Preparing to run Careerate in production mode..."

# Use port 5000 for production
export PORT=5000

# Start the production server
echo "🚀 Starting production server on port $PORT..."
cd dist && NODE_ENV=production node server/index.js
