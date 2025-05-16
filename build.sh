#!/bin/bash

# Careerate Build Script for Production
echo "📦 Building Careerate for production..."

# Step 1: Run the server build script
echo "🔨 Transpiling TypeScript to JavaScript..."
node server-build.js

# Step 2: Create a run script for production
# This will use a different port for the production server
echo "📝 Creating production run script..."

cat > run.sh << 'EOF'
#!/bin/bash
echo "🚀 Preparing to run Careerate in production mode..."

# Use port 8000 for production to avoid conflicts with development server on port 5000
export PORT=8000

# Start the production server
echo "🚀 Starting production server on port $PORT..."
cd dist && NODE_ENV=production node server-start.js
EOF

chmod +x run.sh

echo "✅ Build complete! Run './run.sh' to start the production server."