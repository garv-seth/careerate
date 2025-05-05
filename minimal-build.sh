#!/bin/bash
set -e

echo "======== MINIMAL DEPLOYMENT BUILD ========"

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy server files directly without compiling
echo "Copying server files..."
cp -r server dist/
cp -r shared dist/

# Copy package files for dependencies
echo "Copying package.json..."
cp package.json dist/

# Modify package.json for production compatibility
echo "Updating package.json for production..."
if [ -f dist/package.json ]; then
  # Create a CommonJS compatible package.json
  sed -i 's/"type": "module"/"type": "commonjs"/g' dist/package.json
  echo "  - Changed module type to commonjs"
fi

# Create a minimal index.js entry point (now as CommonJS)
echo "Creating entry point..."
cat > dist/index.js << 'EOL'
// Minimal entry point for production (CommonJS)
console.log("Starting server in production mode...");
process.env.NODE_ENV = "production";

// Use dynamic import for ESM modules
(async () => {
  try {
    // Use file URL for importing ESM modules
    const { default: serverModule } = await import('./server/index.js');
    console.log("Server started successfully!");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
EOL

echo "Minimal build completed"